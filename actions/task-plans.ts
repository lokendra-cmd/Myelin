"use server";

import { revalidatePath as nextRevalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import {
  serializeAttachment,
  serializeChecklist,
  serializeChecklistItem,
  serializeNote,
  serializePlan,
  serializePlanPage,
  serializePlanStep,
} from "@/lib/serializers";
import {
  attachmentInputSchema,
  checklistInputSchema,
  checklistItemInputSchema,
  checklistItemUpdateSchema,
  checklistUpdateSchema,
  noteUpdateSchema,
  planStepInputSchema,
  planStepUpdateSchema,
  planUpdateSchema,
  reorderStepsSchema,
} from "@/lib/validations";
import { Category as CategoryModel } from "@/models/Category";
import { Task } from "@/models/Task";
import { TaskAttachment } from "@/models/TaskAttachment";
import { TaskChecklist } from "@/models/TaskChecklist";
import { TaskChecklistItem } from "@/models/TaskChecklistItem";
import { TaskNote } from "@/models/TaskNote";
import { TaskPlan } from "@/models/TaskPlan";
import { TaskPlanStep } from "@/models/TaskPlanStep";
import type {
  TaskAttachmentDTO,
  TaskChecklistDTO,
  TaskNoteDTO,
  TaskPlanPageDTO,
  TaskPlanStepDTO,
} from "@/types/task-plan";

function revalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch {
    // Suppress invariant when executing outside a request cycle.
  }
}

function revalidateTaskPaths(sprintId: string, taskId: string) {
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath(`/sprints/${sprintId}/tasks/${taskId}`);
}

/** Keep denormalized step counters on Task in sync after step mutations. */
async function syncTaskStepCounters(taskId: string, planId: string) {
  const [planStepCount, planCompletedStepCount] = await Promise.all([
    TaskPlanStep.countDocuments({ planId }),
    TaskPlanStep.countDocuments({ planId, isCompleted: true }),
  ]);
  await Task.findByIdAndUpdate(taskId, { planStepCount, planCompletedStepCount });
  return { planStepCount, planCompletedStepCount };
}

/**
 * Ensure a plan exists for the task. Lazily migrates legacy `task.plan` text
 * into overview on first open so list documents stay untouched until needed.
 */
async function ensurePlan(taskId: string) {
  let plan = await TaskPlan.findOne({ taskId }).lean();
  if (plan) return plan;

  const task = await Task.findById(taskId).lean();
  if (!task) throw new Error("Task not found");

  const legacyPlan = String((task as { plan?: string }).plan ?? "").trim();
  const created = await TaskPlan.create({
    taskId,
    overview: legacyPlan.slice(0, 2000),
    estimatedTimeMinutes: (task as { estimatedTimeMinutes?: number | null }).estimatedTimeMinutes ?? null,
  });
  return created.toObject();
}

async function loadPlanBundle(planId: string) {
  const steps = await TaskPlanStep.find({ planId }).sort({ orderIndex: 1 }).lean();
  return { steps };
}

export async function getTaskPlanPage(taskId: string): Promise<TaskPlanPageDTO> {
  await connectDB();
  const task = await Task.findById(taskId).lean();
  if (!task) throw new Error("Task not found");

  const planDoc = await ensurePlan(taskId);
  const { steps } = await loadPlanBundle(String(planDoc._id));

  // Refresh denormalized counters if they drifted (e.g. after partial writes).
  const completed = steps.filter((s) => s.isCompleted).length;
  if (
    Number((task as { planStepCount?: number }).planStepCount ?? 0) !== steps.length ||
    Number((task as { planCompletedStepCount?: number }).planCompletedStepCount ?? 0) !== completed
  ) {
    await Task.findByIdAndUpdate(taskId, {
      planStepCount: steps.length,
      planCompletedStepCount: completed,
    });
    (task as { planStepCount: number }).planStepCount = steps.length;
    (task as { planCompletedStepCount: number }).planCompletedStepCount = completed;
  }

  const categoryKey = String((task as { category?: string }).category ?? "");
  const category = categoryKey
    ? await CategoryModel.findOne({ key: categoryKey }).select({ label: 1 }).lean()
    : null;

  return serializePlanPage(
    task,
    serializePlan(planDoc, steps),
    category ? String((category as { label?: string }).label ?? categoryKey) : categoryKey,
  );
}

export async function updatePlan(taskId: string, input: unknown) {
  await connectDB();
  const data = planUpdateSchema.parse(input);
  const plan = await ensurePlan(taskId);
  const updated = await TaskPlan.findByIdAndUpdate(plan._id, data, { new: true }).lean();
  if (!updated) throw new Error("Plan not found");

  // Mirror estimated time onto the task summary for list/header badges.
  if (data.estimatedTimeMinutes !== undefined) {
    await Task.findByIdAndUpdate(taskId, { estimatedTimeMinutes: data.estimatedTimeMinutes });
  }

  const task = await Task.findById(taskId).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  const { steps } = await loadPlanBundle(String(updated._id));
  return serializePlan(updated, steps);
}

export async function addPlanStep(taskId: string, input: unknown): Promise<TaskPlanStepDTO> {
  await connectDB();
  const data = planStepInputSchema.parse(input);
  const plan = await ensurePlan(taskId);
  const planId = String(plan._id);

  const orderIndex =
    data.orderIndex ?? (await TaskPlanStep.countDocuments({ planId }));

  const step = await TaskPlanStep.create({
    planId,
    orderIndex,
    title: data.title,
    description: data.description ?? "",
    durationMinutes: data.durationMinutes ?? 0,
    icon: data.icon ?? "Clipboard",
    isCompleted: data.isCompleted ?? false,
    isCollapsed: data.isCollapsed ?? false,
  });

  await syncTaskStepCounters(taskId, planId);
  const task = await Task.findById(taskId).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  return serializePlanStep(step.toObject());
}

export async function updatePlanStep(taskId: string, stepId: string, input: unknown) {
  await connectDB();
  const data = planStepUpdateSchema.parse(input);
  const plan = await ensurePlan(taskId);
  const planId = String(plan._id);

  const step = await TaskPlanStep.findOneAndUpdate(
    { _id: stepId, planId },
    data,
    { new: true },
  ).lean();
  if (!step) throw new Error("Step not found");

  if (data.isCompleted !== undefined) {
    await syncTaskStepCounters(taskId, planId);
  }

  const task = await Task.findById(taskId).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  return serializePlanStep(step);
}

export async function deletePlanStep(taskId: string, stepId: string) {
  await connectDB();
  const plan = await ensurePlan(taskId);
  const planId = String(plan._id);

  const deleted = await TaskPlanStep.findOneAndDelete({ _id: stepId, planId }).lean();
  if (!deleted) throw new Error("Step not found");

  // Compact order indexes after the gap so lists stay contiguous.
  const remaining = await TaskPlanStep.find({ planId }).sort({ orderIndex: 1 }).lean();
  await Promise.all(
    remaining.map((s, index) =>
      Number(s.orderIndex) === index
        ? Promise.resolve()
        : TaskPlanStep.updateOne({ _id: s._id }, { orderIndex: index }),
    ),
  );

  await syncTaskStepCounters(taskId, planId);
  const task = await Task.findById(taskId).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  return { ok: true };
}

export async function duplicatePlanStep(taskId: string, stepId: string): Promise<TaskPlanStepDTO> {
  await connectDB();
  const plan = await ensurePlan(taskId);
  const planId = String(plan._id);

  const source = await TaskPlanStep.findOne({ _id: stepId, planId }).lean();
  if (!source) throw new Error("Step not found");

  const insertAt = Number(source.orderIndex) + 1;
  // Shift subsequent steps down by one (only affected indexes).
  await TaskPlanStep.updateMany(
    { planId, orderIndex: { $gte: insertAt } },
    { $inc: { orderIndex: 1 } },
  );

  const clone = await TaskPlanStep.create({
    planId,
    orderIndex: insertAt,
    title: `${String(source.title)} (copy)`,
    description: source.description ?? "",
    durationMinutes: source.durationMinutes ?? 0,
    icon: source.icon ?? "Clipboard",
    isCompleted: false,
    isCollapsed: false,
  });

  await syncTaskStepCounters(taskId, planId);
  const task = await Task.findById(taskId).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  return serializePlanStep(clone.toObject());
}

/**
 * Reorder steps with a single ordered id list.
 * Only writes documents whose orderIndex actually changed.
 */
export async function reorderPlanSteps(taskId: string, input: unknown) {
  await connectDB();
  const { stepIds } = reorderStepsSchema.parse(input);
  const plan = await ensurePlan(taskId);
  const planId = String(plan._id);

  const existing = await TaskPlanStep.find({ planId }).select({ _id: 1, orderIndex: 1 }).lean();
  const byId = new Map(existing.map((s) => [String(s._id), Number(s.orderIndex)]));

  // Reject unknown ids to avoid corrupting another plan's steps.
  for (const id of stepIds) {
    if (!byId.has(id)) throw new Error(`Unknown step: ${id}`);
  }

  await Promise.all(
    stepIds.map((id, orderIndex) => {
      if (byId.get(id) === orderIndex) return Promise.resolve();
      return TaskPlanStep.updateOne({ _id: id, planId }, { orderIndex });
    }),
  );

  const task = await Task.findById(taskId).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  const steps = await TaskPlanStep.find({ planId }).sort({ orderIndex: 1 }).lean();
  return steps.map(serializePlanStep);
}

export async function getTaskChecklists(taskId: string): Promise<TaskChecklistDTO[]> {
  await connectDB();
  const checklists = await TaskChecklist.find({ taskId }).sort({ orderIndex: 1 }).lean();
  if (checklists.length === 0) return [];

  const ids = checklists.map((c) => c._id);
  const items = await TaskChecklistItem.find({ checklistId: { $in: ids } })
    .sort({ orderIndex: 1 })
    .lean();

  const byChecklist = new Map<string, typeof items>();
  for (const item of items) {
    const key = String(item.checklistId);
    const bucket = byChecklist.get(key);
    if (bucket) bucket.push(item);
    else byChecklist.set(key, [item]);
  }

  return checklists.map((c) => serializeChecklist(c, byChecklist.get(String(c._id)) ?? []));
}

export async function addChecklist(taskId: string, input: unknown): Promise<TaskChecklistDTO> {
  await connectDB();
  const data = checklistInputSchema.parse(input);
  const orderIndex = data.orderIndex ?? (await TaskChecklist.countDocuments({ taskId }));
  const checklist = await TaskChecklist.create({
    taskId,
    title: data.title,
    orderIndex,
  });
  return serializeChecklist(checklist.toObject(), []);
}

export async function updateChecklist(taskId: string, checklistId: string, input: unknown) {
  await connectDB();
  const data = checklistUpdateSchema.parse(input);
  const checklist = await TaskChecklist.findOneAndUpdate(
    { _id: checklistId, taskId },
    data,
    { new: true },
  ).lean();
  if (!checklist) throw new Error("Checklist not found");
  const items = await TaskChecklistItem.find({ checklistId }).sort({ orderIndex: 1 }).lean();
  return serializeChecklist(checklist, items);
}

export async function deleteChecklist(taskId: string, checklistId: string) {
  await connectDB();
  const deleted = await TaskChecklist.findOneAndDelete({ _id: checklistId, taskId });
  if (!deleted) throw new Error("Checklist not found");
  await TaskChecklistItem.deleteMany({ checklistId });
  return { ok: true };
}

export async function addChecklistItem(checklistId: string, input: unknown) {
  await connectDB();
  const data = checklistItemInputSchema.parse(input);
  const orderIndex =
    data.orderIndex ?? (await TaskChecklistItem.countDocuments({ checklistId }));
  const item = await TaskChecklistItem.create({
    checklistId,
    title: data.title,
    completed: data.completed ?? false,
    orderIndex,
  });
  return serializeChecklistItem(item.toObject());
}

export async function updateChecklistItem(checklistId: string, itemId: string, input: unknown) {
  await connectDB();
  const data = checklistItemUpdateSchema.parse(input);
  const item = await TaskChecklistItem.findOneAndUpdate(
    { _id: itemId, checklistId },
    data,
    { new: true },
  ).lean();
  if (!item) throw new Error("Checklist item not found");
  return item;
}

export async function deleteChecklistItem(checklistId: string, itemId: string) {
  await connectDB();
  await TaskChecklistItem.findOneAndDelete({ _id: itemId, checklistId });
  return { ok: true };
}

/* ─── Notes & Attachments (lazy-loaded tabs) ─────────────────────── */

export async function getTaskNote(taskId: string): Promise<TaskNoteDTO> {
  await connectDB();
  let note = await TaskNote.findOne({ taskId }).lean();
  if (!note) {
    const created = await TaskNote.create({ taskId, content: "" });
    note = created.toObject();
  }
  return serializeNote(note);
}

export async function updateTaskNote(taskId: string, input: unknown): Promise<TaskNoteDTO> {
  await connectDB();
  const { content } = noteUpdateSchema.parse(input);
  const note = await TaskNote.findOneAndUpdate(
    { taskId },
    { content },
    { new: true, upsert: true },
  ).lean();
  return serializeNote(note!);
}

export async function getTaskAttachments(taskId: string): Promise<TaskAttachmentDTO[]> {
  await connectDB();
  const docs = await TaskAttachment.find({ taskId }).sort({ createdAt: -1 }).lean();
  return docs.map(serializeAttachment);
}

export async function addTaskAttachment(taskId: string, input: unknown): Promise<TaskAttachmentDTO> {
  await connectDB();
  const data = attachmentInputSchema.parse(input);
  const doc = await TaskAttachment.create({
    taskId,
    fileName: data.fileName,
    storageUrl: data.storageUrl,
    mimeType: data.mimeType ?? "application/octet-stream",
    size: data.size ?? 0,
  });
  return serializeAttachment(doc.toObject());
}

export async function deleteTaskAttachment(taskId: string, attachmentId: string) {
  await connectDB();
  const deleted = await TaskAttachment.findOneAndDelete({ _id: attachmentId, taskId });
  if (!deleted) throw new Error("Attachment not found");
  return { ok: true };
}

/** Cascade-delete all plan-related documents for a task. Called from deleteTask. */
export async function cascadeDeleteTaskPlanData(taskId: string) {
  await connectDB();
  const plan = await TaskPlan.findOne({ taskId }).select({ _id: 1 }).lean();
  if (plan) {
    const planId = plan._id;
    await Promise.all([
      TaskPlanStep.deleteMany({ planId }),
      TaskPlan.deleteOne({ _id: planId }),
    ]);
  }

  const checklists = await TaskChecklist.find({ taskId }).select({ _id: 1 }).lean();
  if (checklists.length > 0) {
    await TaskChecklistItem.deleteMany({ checklistId: { $in: checklists.map((c) => c._id) } });
    await TaskChecklist.deleteMany({ taskId });
  }

  await Promise.all([
    TaskNote.deleteMany({ taskId }),
    TaskAttachment.deleteMany({ taskId }),
  ]);
}
