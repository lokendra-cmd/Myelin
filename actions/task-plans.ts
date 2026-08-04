"use server";

import { revalidatePath as nextRevalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { requireUserId } from "@/lib/session";
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

async function requireOwnedTask(taskId: string, userId: string) {
  const task = await Task.findOne({ _id: taskId, userId }).lean();
  if (!task) throw new Error("Task not found");
  return task;
}

/** Keep denormalized step counters on Task in sync after step mutations. */
async function syncTaskStepCounters(taskId: string, planId: string, userId: string) {
  const [planStepCount, planCompletedStepCount] = await Promise.all([
    TaskPlanStep.countDocuments({ planId, userId }),
    TaskPlanStep.countDocuments({ planId, userId, isCompleted: true }),
  ]);
  await Task.findOneAndUpdate({ _id: taskId, userId }, { planStepCount, planCompletedStepCount });
  return { planStepCount, planCompletedStepCount };
}

/**
 * Ensure a plan exists for the task. Lazily migrates legacy `task.plan` text
 * into overview on first open so list documents stay untouched until needed.
 */
async function ensurePlan(taskId: string, userId: string) {
  let plan = await TaskPlan.findOne({ taskId, userId }).lean();
  if (plan) return plan;

  const task = await Task.findOne({ _id: taskId, userId }).lean();
  if (!task) throw new Error("Task not found");

  const legacyPlan = String((task as { plan?: string }).plan ?? "").trim();
  const created = await TaskPlan.create({
    taskId,
    userId,
    overview: legacyPlan.slice(0, 2000),
    estimatedTimeMinutes: (task as { estimatedTimeMinutes?: number | null }).estimatedTimeMinutes ?? null,
  });
  return created.toObject();
}

async function loadPlanBundle(planId: string, userId: string) {
  const steps = await TaskPlanStep.find({ planId, userId }).sort({ orderIndex: 1 }).lean();
  return { steps };
}

export async function getTaskPlanPage(taskId: string): Promise<TaskPlanPageDTO> {
  const userId = await requireUserId();
  await connectDB();
  const task = await requireOwnedTask(taskId, userId);

  const planDoc = await ensurePlan(taskId, userId);
  const categoryKey = String((task as { category?: string }).category ?? "");

  const [{ steps }, category] = await Promise.all([
    loadPlanBundle(String(planDoc._id), userId),
    categoryKey
      ? CategoryModel.findOne({ key: categoryKey, userId }).select({ label: 1 }).lean()
      : Promise.resolve(null),
  ]);

  // Refresh denormalized counters if they drifted — don't block the response.
  const completed = steps.filter((s) => s.isCompleted).length;
  const stepCount = Number((task as { planStepCount?: number }).planStepCount ?? 0);
  const completedCount = Number((task as { planCompletedStepCount?: number }).planCompletedStepCount ?? 0);
  if (stepCount !== steps.length || completedCount !== completed) {
    void Task.findOneAndUpdate(
      { _id: taskId, userId },
      {
        planStepCount: steps.length,
        planCompletedStepCount: completed,
      },
    );
    (task as { planStepCount: number }).planStepCount = steps.length;
    (task as { planCompletedStepCount: number }).planCompletedStepCount = completed;
  }

  return serializePlanPage(
    task,
    serializePlan(planDoc, steps),
    category ? String((category as { label?: string }).label ?? categoryKey) : categoryKey,
  );
}

export async function updatePlan(taskId: string, input: unknown) {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const data = planUpdateSchema.parse(input);
  const plan = await ensurePlan(taskId, userId);
  const updated = await TaskPlan.findOneAndUpdate(
    { _id: plan._id, userId },
    data,
    { new: true },
  ).lean();
  if (!updated) throw new Error("Plan not found");

  // Mirror estimated time onto the task summary for list/header badges.
  if (data.estimatedTimeMinutes !== undefined) {
    await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { estimatedTimeMinutes: data.estimatedTimeMinutes },
    );
  }

  const task = await Task.findOne({ _id: taskId, userId }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  const { steps } = await loadPlanBundle(String(updated._id), userId);
  return serializePlan(updated, steps);
}

export async function addPlanStep(taskId: string, input: unknown): Promise<TaskPlanStepDTO> {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const data = planStepInputSchema.parse(input);
  const plan = await ensurePlan(taskId, userId);
  const planId = String(plan._id);

  const orderIndex =
    data.orderIndex ?? (await TaskPlanStep.countDocuments({ planId, userId }));

  const step = await TaskPlanStep.create({
    planId,
    userId,
    orderIndex,
    title: data.title,
    description: data.description ?? "",
    durationMinutes: data.durationMinutes ?? 0,
    icon: data.icon ?? "Clipboard",
    isCompleted: data.isCompleted ?? false,
    isCollapsed: data.isCollapsed ?? false,
  });

  await syncTaskStepCounters(taskId, planId, userId);
  const task = await Task.findOne({ _id: taskId, userId }).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  return serializePlanStep(step.toObject());
}

export async function updatePlanStep(taskId: string, stepId: string, input: unknown) {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const data = planStepUpdateSchema.parse(input);
  const plan = await ensurePlan(taskId, userId);
  const planId = String(plan._id);

  const step = await TaskPlanStep.findOneAndUpdate(
    { _id: stepId, planId, userId },
    data,
    { new: true },
  ).lean();
  if (!step) throw new Error("Step not found");

  if (data.isCompleted !== undefined) {
    await syncTaskStepCounters(taskId, planId, userId);
  }

  const task = await Task.findOne({ _id: taskId, userId }).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  return serializePlanStep(step);
}

export async function deletePlanStep(taskId: string, stepId: string) {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const plan = await ensurePlan(taskId, userId);
  const planId = String(plan._id);

  const deleted = await TaskPlanStep.findOneAndDelete({ _id: stepId, planId, userId }).lean();
  if (!deleted) throw new Error("Step not found");

  // Compact order indexes after the gap so lists stay contiguous.
  const remaining = await TaskPlanStep.find({ planId, userId }).sort({ orderIndex: 1 }).lean();
  await Promise.all(
    remaining.map((s, index) =>
      Number(s.orderIndex) === index
        ? Promise.resolve()
        : TaskPlanStep.updateOne({ _id: s._id, userId }, { orderIndex: index }),
    ),
  );

  await syncTaskStepCounters(taskId, planId, userId);
  const task = await Task.findOne({ _id: taskId, userId }).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  return { ok: true };
}

export async function duplicatePlanStep(taskId: string, stepId: string): Promise<TaskPlanStepDTO> {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const plan = await ensurePlan(taskId, userId);
  const planId = String(plan._id);

  const source = await TaskPlanStep.findOne({ _id: stepId, planId, userId }).lean();
  if (!source) throw new Error("Step not found");

  const insertAt = Number(source.orderIndex) + 1;
  // Shift subsequent steps down by one (only affected indexes).
  await TaskPlanStep.updateMany(
    { planId, userId, orderIndex: { $gte: insertAt } },
    { $inc: { orderIndex: 1 } },
  );

  const clone = await TaskPlanStep.create({
    planId,
    userId,
    orderIndex: insertAt,
    title: `${String(source.title)} (copy)`,
    description: source.description ?? "",
    durationMinutes: source.durationMinutes ?? 0,
    icon: source.icon ?? "Clipboard",
    isCompleted: false,
    isCollapsed: false,
  });

  await syncTaskStepCounters(taskId, planId, userId);
  const task = await Task.findOne({ _id: taskId, userId }).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  return serializePlanStep(clone.toObject());
}

/**
 * Reorder steps with a single ordered id list.
 * Only writes documents whose orderIndex actually changed.
 */
export async function reorderPlanSteps(taskId: string, input: unknown) {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const { stepIds } = reorderStepsSchema.parse(input);
  const plan = await ensurePlan(taskId, userId);
  const planId = String(plan._id);

  const existing = await TaskPlanStep.find({ planId, userId }).select({ _id: 1, orderIndex: 1 }).lean();
  const byId = new Map(existing.map((s) => [String(s._id), Number(s.orderIndex)]));

  // Reject unknown ids to avoid corrupting another plan's steps.
  for (const id of stepIds) {
    if (!byId.has(id)) throw new Error(`Unknown step: ${id}`);
  }

  await Promise.all(
    stepIds.map((id, orderIndex) => {
      if (byId.get(id) === orderIndex) return Promise.resolve();
      return TaskPlanStep.updateOne({ _id: id, planId, userId }, { orderIndex });
    }),
  );

  const task = await Task.findOne({ _id: taskId, userId }).select({ sprintId: 1 }).lean();
  if (task) revalidateTaskPaths(String((task as { sprintId: unknown }).sprintId), taskId);

  const steps = await TaskPlanStep.find({ planId, userId }).sort({ orderIndex: 1 }).lean();
  return steps.map(serializePlanStep);
}

export async function getTaskChecklists(taskId: string): Promise<TaskChecklistDTO[]> {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const checklists = await TaskChecklist.find({ taskId, userId }).sort({ orderIndex: 1 }).lean();
  if (checklists.length === 0) return [];

  const ids = checklists.map((c) => c._id);
  const items = await TaskChecklistItem.find({ checklistId: { $in: ids }, userId })
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
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const data = checklistInputSchema.parse(input);
  const orderIndex = data.orderIndex ?? (await TaskChecklist.countDocuments({ taskId, userId }));
  const checklist = await TaskChecklist.create({
    taskId,
    userId,
    title: data.title,
    orderIndex,
  });
  return serializeChecklist(checklist.toObject(), []);
}

export async function updateChecklist(taskId: string, checklistId: string, input: unknown) {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const data = checklistUpdateSchema.parse(input);
  const checklist = await TaskChecklist.findOneAndUpdate(
    { _id: checklistId, taskId, userId },
    data,
    { new: true },
  ).lean();
  if (!checklist) throw new Error("Checklist not found");
  const items = await TaskChecklistItem.find({ checklistId, userId }).sort({ orderIndex: 1 }).lean();
  return serializeChecklist(checklist, items);
}

export async function deleteChecklist(taskId: string, checklistId: string) {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const deleted = await TaskChecklist.findOneAndDelete({ _id: checklistId, taskId, userId });
  if (!deleted) throw new Error("Checklist not found");
  await TaskChecklistItem.deleteMany({ checklistId, userId });
  return { ok: true };
}

export async function addChecklistItem(checklistId: string, input: unknown) {
  const userId = await requireUserId();
  await connectDB();
  const checklist = await TaskChecklist.findOne({ _id: checklistId, userId }).lean();
  if (!checklist) throw new Error("Checklist not found");
  const data = checklistItemInputSchema.parse(input);
  const orderIndex =
    data.orderIndex ?? (await TaskChecklistItem.countDocuments({ checklistId, userId }));
  const item = await TaskChecklistItem.create({
    checklistId,
    userId,
    title: data.title,
    completed: data.completed ?? false,
    orderIndex,
  });
  return serializeChecklistItem(item.toObject());
}

export async function updateChecklistItem(checklistId: string, itemId: string, input: unknown) {
  const userId = await requireUserId();
  await connectDB();
  const checklist = await TaskChecklist.findOne({ _id: checklistId, userId }).lean();
  if (!checklist) throw new Error("Checklist not found");
  const data = checklistItemUpdateSchema.parse(input);
  const item = await TaskChecklistItem.findOneAndUpdate(
    { _id: itemId, checklistId, userId },
    data,
    { new: true },
  ).lean();
  if (!item) throw new Error("Checklist item not found");
  return item;
}

export async function deleteChecklistItem(checklistId: string, itemId: string) {
  const userId = await requireUserId();
  await connectDB();
  const checklist = await TaskChecklist.findOne({ _id: checklistId, userId }).lean();
  if (!checklist) throw new Error("Checklist not found");
  await TaskChecklistItem.findOneAndDelete({ _id: itemId, checklistId, userId });
  return { ok: true };
}

/* ─── Notes & Attachments (lazy-loaded tabs) ─────────────────────── */

export async function getTaskNote(taskId: string): Promise<TaskNoteDTO> {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  let note = await TaskNote.findOne({ taskId, userId }).lean();
  if (!note) {
    const created = await TaskNote.create({ taskId, userId, content: "" });
    note = created.toObject();
  }
  return serializeNote(note);
}

export async function updateTaskNote(taskId: string, input: unknown): Promise<TaskNoteDTO> {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const { content } = noteUpdateSchema.parse(input);
  const note = await TaskNote.findOneAndUpdate(
    { taskId, userId },
    { content, userId },
    { new: true, upsert: true },
  ).lean();
  return serializeNote(note!);
}

export async function getTaskAttachments(taskId: string): Promise<TaskAttachmentDTO[]> {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const docs = await TaskAttachment.find({ taskId, userId }).sort({ createdAt: -1 }).lean();
  return docs.map(serializeAttachment);
}

export async function addTaskAttachment(taskId: string, input: unknown): Promise<TaskAttachmentDTO> {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const data = attachmentInputSchema.parse(input);
  const doc = await TaskAttachment.create({
    taskId,
    userId,
    fileName: data.fileName,
    storageUrl: data.storageUrl,
    mimeType: data.mimeType ?? "application/octet-stream",
    size: data.size ?? 0,
  });
  return serializeAttachment(doc.toObject());
}

export async function deleteTaskAttachment(taskId: string, attachmentId: string) {
  const userId = await requireUserId();
  await connectDB();
  await requireOwnedTask(taskId, userId);
  const deleted = await TaskAttachment.findOneAndDelete({ _id: attachmentId, taskId, userId });
  if (!deleted) throw new Error("Attachment not found");
  return { ok: true };
}

/** Cascade-delete all plan-related documents for a task. Called from deleteTask. */
export async function cascadeDeleteTaskPlanData(taskId: string, userId: string) {
  await connectDB();
  const plan = await TaskPlan.findOne({ taskId, userId }).select({ _id: 1 }).lean();
  if (plan) {
    const planId = plan._id;
    await Promise.all([
      TaskPlanStep.deleteMany({ planId, userId }),
      TaskPlan.deleteOne({ _id: planId, userId }),
    ]);
  }

  const checklists = await TaskChecklist.find({ taskId, userId }).select({ _id: 1 }).lean();
  if (checklists.length > 0) {
    await TaskChecklistItem.deleteMany({
      checklistId: { $in: checklists.map((c) => c._id) },
      userId,
    });
    await TaskChecklist.deleteMany({ taskId, userId });
  }

  await Promise.all([
    TaskNote.deleteMany({ taskId, userId }),
    TaskAttachment.deleteMany({ taskId, userId }),
  ]);
}
