"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { DEFAULT_CATEGORIES, SPRINT_RULES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { serializeCategory, serializeSprint, serializeRule, serializeBrainDumpThought } from "@/lib/serializers";
import { categoryInputSchema, categoryUpdateSchema, reorderSchema, sprintUpdateSchema, taskInputSchema, taskUpdateSchema, ruleInputSchema, ruleUpdateSchema } from "@/lib/validations";
import { Category as CategoryModel } from "@/models/Category";
import { Rule as RuleModel } from "@/models/Rule";
import { Sprint } from "@/models/Sprint";
import { Task } from "@/models/Task";
import { BrainDumpThought } from "@/models/BrainDumpThought";
import type { AnalyticsData, Category, CategoryDTO, SprintDTO, RuleDTO, BrainDumpThoughtDTO } from "@/types/sprint";
import { isoDate, formatSprintDate } from "@/utils/date";
import { getServerTimeZone } from "@/utils/dateServer";
import { calculateProductivity } from "@/utils/productivity";

async function recalculateSprint(sprintId: string) {
  const [completedTasks, totalTasks] = await Promise.all([
    Task.countDocuments({ sprintId, completed: true }),
    Task.countDocuments({ sprintId }),
  ]);

  const productivity = calculateProductivity(completedTasks, totalTasks);
  await Sprint.findByIdAndUpdate(sprintId, { completedTasks, totalTasks, productivity });
}

function normalizeHighlights(sprint: { highlightTaskIds?: unknown; highlightTaskId?: unknown } | null | undefined) {
  if (!sprint) return [];
  if (Array.isArray(sprint.highlightTaskIds)) return sprint.highlightTaskIds.map(String);
  if (sprint.highlightTaskId) return [String(sprint.highlightTaskId)];
  return [];
}

async function sprintWithTasks(id: string): Promise<SprintDTO | null> {
  const sprint = await Sprint.findById(id).lean();
  if (!sprint) return null;
  const tasks = await Task.find({ sprintId: id }).sort({ category: 1, order: 1 }).lean();
  return serializeSprint(sprint, tasks);
}

export async function getSprint(id: string) {
  await connectDB();
  const sprint = await sprintWithTasks(id);
  return sprint;
}

export async function getSprintByDate(date: string) {
  await connectDB();
  const sprint = await Sprint.findOne({ date }).lean();
  if (!sprint) return null;
  const tasks = await Task.find({ sprintId: sprint._id }).sort({ category: 1, order: 1 }).lean();
  return serializeSprint(sprint, tasks);
}

export async function getCategories(): Promise<CategoryDTO[]> {
  await connectDB();
  await ensureDefaultCategories();
  const docs = await CategoryModel.find().sort({ order: 1, label: 1 }).lean();
  return docs.map(serializeCategory);
}

export async function getRules(): Promise<RuleDTO[]> {
  await connectDB();
  await ensureDefaultRules();
  const docs = await RuleModel.find().sort({ order: 1 }).lean();
  return docs.map(serializeRule);
}

export async function createCategory(input: unknown) {
  await connectDB();
  const { label, tagline, icon, themeId, isBrainDump } = categoryInputSchema.parse(input);
  const order = await CategoryModel.countDocuments();
  const category = await CategoryModel.create({
    key: await uniqueCategoryKey(label),
    label,
    emoji: "",
    tagline: tagline ?? "",
    icon: icon ?? "",
    themeId: themeId ?? "",
    isBrainDump: isBrainDump ?? false,
    order,
  });
  revalidatePath("/");
  return serializeCategory(category.toObject());
}

export async function updateCategory(key: string, input: unknown) {
  await connectDB();
  const { label, tagline, icon, themeId, isBrainDump } = categoryUpdateSchema.parse(input);
  const category = await CategoryModel.findOneAndUpdate(
    { key },
    { label, tagline, icon, themeId, isBrainDump },
    { new: true }
  ).lean();
  if (!category) throw new Error("Category not found");
  revalidatePath("/");
  return serializeCategory(category);
}

export async function createRule(input: unknown) {
  await connectDB();
  const { text, icon, themeId } = ruleInputSchema.parse(input);
  const order = await RuleModel.countDocuments();
  const rule = await RuleModel.create({
    text,
    icon: icon ?? "",
    themeId: themeId ?? "",
    order,
  });
  revalidatePath("/");
  return serializeRule(rule.toObject());
}

export async function updateRule(id: string, input: unknown) {
  await connectDB();
  const { text, icon, themeId } = ruleUpdateSchema.parse(input);
  const rule = await RuleModel.findByIdAndUpdate(
    id,
    { text, icon, themeId },
    { new: true }
  ).lean();
  if (!rule) throw new Error("Rule not found");
  revalidatePath("/");
  return serializeRule(rule);
}

export async function deleteRule(id: string) {
  await connectDB();
  const rule = await RuleModel.findByIdAndDelete(id).lean();
  if (!rule) throw new Error("Rule not found");
  revalidatePath("/");
  return serializeRule(rule);
}

export async function deleteCategory(key: string, sprintId?: string) {
  await connectDB();
  const categoryCount = await CategoryModel.countDocuments();
  if (categoryCount <= 1) throw new Error("Keep at least one category");

  const category = await CategoryModel.findOneAndDelete({ key }).lean();
  if (!category) throw new Error("Category not found");

  const affectedTasks = await Task.find({ category: key }).select("sprintId").lean();
  const affectedSprintIds = Array.from(new Set(affectedTasks.map((task) => String(task.sprintId))));

  await Task.deleteMany({ category: key });
  await BrainDumpThought.deleteMany({ category: key });

  await Promise.all(
    affectedSprintIds.map(async (sprintId) => {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint) return;
      sprint.set(
        "highlightTaskIds",
        normalizeHighlights(sprint.toObject()).filter((id) =>
          !affectedTasks.some((task) => String(task._id) === id),
        ),
      );
      await sprint.save();
    }),
  );

  await Promise.all(affectedSprintIds.map(recalculateSprint));
  revalidatePath("/");
  if (sprintId) revalidatePath(`/sprints/${sprintId}`);
  return sprintId ? sprintWithTasks(sprintId) : null;
}

export async function createSprint(date?: string) {
  await connectDB();
  const tz = await getServerTimeZone();
  const targetDate = date || isoDate(undefined, tz);
  const existing = await Sprint.findOne({ date: targetDate }).lean();
  if (existing) return serializeSprint(existing, await Task.find({ sprintId: existing._id }).lean());

  const title = `Myelination ${formatSprintDate(targetDate)}`;
  const sprint = await Sprint.create({ date: targetDate, title, highlightTaskIds: [] });
  const dayOfWeek = new Date(`${targetDate}T00:00:00Z`).getUTCDay();

  // Fetch ALL recurring tasks but deduplicate by (title, category) so that copies-of-copies
  // from previous sprints don't compound. We keep the first occurrence of each unique task.
  const allRecurring = await Task.find({ isRecurring: true }).sort({ category: 1, order: 1 }).lean();

  const seen = new Set<string>();
  const uniqueRecurring = allRecurring.filter((task) => {
    const key = `${task.category}::${task.title.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const tasksToDuplicate = uniqueRecurring.filter((task) => {
    if (!task.recurringDays || task.recurringDays.length === 0) {
      return true;
    }
    return task.recurringDays.includes(dayOfWeek);
  });

  if (tasksToDuplicate.length) {
    await Task.insertMany(
      tasksToDuplicate.map((task, index) => ({
        sprintId: sprint._id,
        title: task.title,
        category: task.category,
        completed: false,
        isRecurring: true,
        recurringDays: task.recurringDays || [],
        order: index,
      })),
    );
  }

  await recalculateSprint(String(sprint._id));
  revalidatePath("/");
  return sprintWithTasks(String(sprint._id));
}


export async function getDashboardData() {
  await connectDB();
  const tz = await getServerTimeZone();
  const todayDate = isoDate(undefined, tz);
  const recentDocs = await Sprint.find({ date: { $ne: "braindump" } }).sort({ date: -1 }).limit(7).lean();
  const recent = await Promise.all(
    recentDocs.map(async (sprint) => serializeSprint(sprint, await Task.find({ sprintId: sprint._id }).lean())),
  );
  const today = recent.find((sprint) => sprint.date === todayDate) ?? (await getSprintByDate(todayDate));
  return { today, recent, currentStreak: getStreak(recent, tz) };
}

export async function getWeeklyReview() {
  await connectDB();
  const docs = await Sprint.find({ date: { $ne: "braindump" } }).sort({ date: -1 }).limit(14).lean();
  return Promise.all(docs.map(async (sprint) => serializeSprint(sprint, await Task.find({ sprintId: sprint._id }).lean())));
}

export async function deleteSprintAction(sprintId: string) {
  await connectDB();
  const deletedSprint = await Sprint.findByIdAndDelete(sprintId).lean();
  if (!deletedSprint) throw new Error("Sprint not found");
  await Task.deleteMany({ sprintId });
  revalidatePath("/");
  revalidatePath("/review");
  return { success: true };
}

export async function getAnalytics(): Promise<AnalyticsData> {
  await connectDB();
  const tz = await getServerTimeZone();
  const categories = await getCategories();
  const docs = await Sprint.find({ date: { $ne: "braindump" } }).sort({ date: 1 }).limit(31).lean();
  const sprints = await Promise.all(docs.map(async (sprint) => serializeSprint(sprint, await Task.find({ sprintId: sprint._id }).lean())));
  const categoryLabels = new Map(categories.map((category) => [category.key, category.label]));
  const categoryMap = new Map<Category, { completed: number; total: number }>(categories.map((category) => [category.key, { completed: 0, total: 0 }]));

  for (const sprint of sprints) {
    for (const task of sprint.tasks) {
      if (!categoryMap.has(task.category)) categoryMap.set(task.category, { completed: 0, total: 0 });
      const bucket = categoryMap.get(task.category)!;
      bucket.total += 1;
      if (task.completed) bucket.completed += 1;
    }
  }

  const completedDays = sprints.filter((sprint) => sprint.totalTasks > 0);
  const averageProductivity = completedDays.length
    ? Math.round(completedDays.reduce((sum, sprint) => sum + sprint.productivity, 0) / completedDays.length)
    : 0;

  return {
    daily: sprints.map((sprint) => ({ date: sprint.date.slice(5), productivity: sprint.productivity })),
    categories: Array.from(categoryMap.entries()).map(([category, values]) => ({
      category,
      label: categoryLabels.get(category) ?? category,
      ...values,
    })),
    averageProductivity,
    longestStreak: getStreak(sprints, tz),
    bestDay: completedDays.toSorted((a, b) => b.productivity - a.productivity)[0] ?? null,
    worstDay: completedDays.toSorted((a, b) => a.productivity - b.productivity)[0] ?? null,
  };
}

async function ensureDefaultCategories() {
  const count = await CategoryModel.countDocuments();
  if (count > 0) return;
  await CategoryModel.insertMany(DEFAULT_CATEGORIES);
}

async function ensureDefaultRules() {
  const count = await RuleModel.countDocuments();
  if (count > 0) return;
  const defaultRules = SPRINT_RULES.map((text, index) => {
    let icon = "CheckCircle";
    if (text.includes("start")) icon = "Target";
    else if (text.includes("9 PM")) icon = "Clock";
    else if (text.includes("deep work")) icon = "ShieldCheck";
    return {
      text,
      icon,
      themeId: "",
      order: index,
    };
  });
  await RuleModel.insertMany(defaultRules);
}

async function uniqueCategoryKey(label: string) {
  const base = slugCategory(label);
  let key = base;
  let suffix = 2;
  while (await CategoryModel.exists({ key })) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  return key;
}

function slugCategory(label: string) {
  const slug = label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `CATEGORY_${Date.now()}`;
}

export async function addTask(sprintId: string, input: unknown) {
  await connectDB();
  const data = taskInputSchema.parse(input);
  const order = data.order ?? (await Task.countDocuments({ sprintId, category: data.category }));
  await Task.create({ sprintId, ...data, order });
  await recalculateSprint(sprintId);
  revalidatePath(`/sprints/${sprintId}`);
  return sprintWithTasks(sprintId);
}

export async function updateTask(sprintId: string, taskId: string, input: unknown) {
  await connectDB();
  const data = taskUpdateSchema.parse(input);
  const { highlight, ...rawUpdates } = data;
  const updates: Record<string, unknown> = { ...rawUpdates };

  if (updates.completed === true) {
    const current = await Task.findOne({ _id: taskId, sprintId }).lean();
    if (current && !current.completed) {
      const completedAtDate = new Date();
      const startedAtDate = (current as unknown as { startedAt?: Date }).startedAt || new Date();
      
      updates.completedAt = completedAtDate;
      updates.startedAt = startedAtDate;

      const newSession = { startedAt: startedAtDate, completedAt: completedAtDate };
      const currentHistory = (current as unknown as { history?: Array<{ startedAt: Date; completedAt: Date }> }).history || [];
      updates.history = [...currentHistory, newSession];
    }
  } else if (updates.completed === false || updates.startedAt === null) {
    updates.completed = false;
    updates.completedAt = null;
    updates.startedAt = null;
  }

  await Task.findOneAndUpdate({ _id: taskId, sprintId }, updates);
  if (highlight !== undefined) {
    const sprint = await Sprint.findById(sprintId).lean<{ highlightTaskIds?: unknown; highlightTaskId?: unknown }>();
    const existing = normalizeHighlights(sprint);
    const highlightTaskIds = highlight ? Array.from(new Set([...existing, taskId])) : existing.filter((id) => id !== taskId);
    await Sprint.findByIdAndUpdate(sprintId, { highlightTaskIds });
  }
  await recalculateSprint(sprintId);
  revalidatePath(`/sprints/${sprintId}`);
  return sprintWithTasks(sprintId);
}

export async function deleteTask(sprintId: string, taskId: string) {
  await connectDB();
  await Task.findOneAndDelete({ _id: taskId, sprintId });
  const sprint = await Sprint.findById(sprintId);
  if (sprint) {
    sprint.set("highlightTaskIds", normalizeHighlights(sprint.toObject()).filter((id) => id !== taskId));
    await sprint.save();
  }
  await recalculateSprint(sprintId);
  revalidatePath(`/sprints/${sprintId}`);
  return sprintWithTasks(sprintId);
}

export async function reorderTasks(sprintId: string, input: unknown) {
  await connectDB();
  const { taskIds } = reorderSchema.parse(input);
  await Promise.all(taskIds.map((id, order) => Task.findOneAndUpdate({ _id: id, sprintId }, { order })));
  revalidatePath(`/sprints/${sprintId}`);
  return sprintWithTasks(sprintId);
}

export async function updateSprint(sprintId: string, input: unknown) {
  await connectDB();
  const data = sprintUpdateSchema.parse(input);
  await Sprint.findByIdAndUpdate(sprintId, data);
  revalidatePath(`/sprints/${sprintId}`);
  return sprintWithTasks(sprintId);
}

export async function searchSprints(query: string) {
  await connectDB();
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const docs = await Sprint.find({
    date: { $ne: "braindump" },
    $or: [{ title: new RegExp(escaped, "i") }, { date: new RegExp(escaped, "i") }],
  })
    .sort({ date: -1 })
    .limit(12)
    .lean();
  return Promise.all(docs.map(async (sprint) => serializeSprint(sprint, await Task.find({ sprintId: sprint._id }).lean())));
}

function getStreak(sprints: SprintDTO[], timeZone: string) {
  const productive = new Set(sprints.filter((sprint) => sprint.productivity >= 70).map((sprint) => sprint.date));
  let streak = 0;
  const todayStr = isoDate(undefined, timeZone);
  const cursor = new Date(`${todayStr}T00:00:00Z`);
  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!productive.has(dateStr)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getBrainDumpSprint(): Promise<SprintDTO> {
  await connectDB();
  const date = "braindump";
  let sprint = await Sprint.findOne({ date }).lean();
  if (!sprint) {
    const doc = await Sprint.create({
      date,
      title: "Brain Dump",
      completedTasks: 0,
      totalTasks: 0,
      productivity: 0,
      highlightTaskIds: [],
    });
    sprint = doc.toObject();
  }
  const tasks = await Task.find({ sprintId: sprint._id }).sort({ category: 1, order: 1 }).lean();
  return serializeSprint(sprint, tasks);
}

export async function moveTaskToToday(taskId: string, targetCategory: string) {
  await connectDB();
  const tz = await getServerTimeZone();
  const todaySprint = await createSprint(isoDate(undefined, tz));
  if (!todaySprint) throw new Error("Could not find or create today's sprint");

  const task = await Task.findById(taskId);
  if (!task) throw new Error("Task not found");

  const oldSprintId = task.sprintId;
  task.sprintId = new mongoose.Types.ObjectId(todaySprint._id) as unknown as mongoose.Types.ObjectId;
  task.category = targetCategory;

  const order = await Task.countDocuments({ sprintId: todaySprint._id, category: targetCategory });
  task.order = order;
  await task.save();

  // Recalculate productivity of both sprints
  await recalculateSprint(String(oldSprintId));
  await recalculateSprint(String(todaySprint._id));

  revalidatePath("/");
  revalidatePath("/brain-dump");
  return { success: true };
}

export async function getBrainDumpThoughts(): Promise<BrainDumpThoughtDTO[]> {
  await connectDB();
  const docs = await BrainDumpThought.find().sort({ order: 1 }).lean();
  return docs.map(serializeBrainDumpThought);
}

export async function createBrainDumpThought(text: string, category: string): Promise<BrainDumpThoughtDTO> {
  await connectDB();
  const count = await BrainDumpThought.countDocuments({ category });
  const doc = await BrainDumpThought.create({
    text,
    category,
    order: count,
  });
  revalidatePath("/brain-dump");
  return serializeBrainDumpThought(doc.toObject());
}

export async function updateBrainDumpThought(id: string, text: string): Promise<BrainDumpThoughtDTO> {
  await connectDB();
  const doc = await BrainDumpThought.findByIdAndUpdate(id, { text }, { new: true }).lean();
  if (!doc) throw new Error("Thought not found");
  revalidatePath("/brain-dump");
  return serializeBrainDumpThought(doc);
}

export async function deleteBrainDumpThought(id: string): Promise<{ success: boolean }> {
  await connectDB();
  await BrainDumpThought.findByIdAndDelete(id);
  revalidatePath("/brain-dump");
  return { success: true };
}

export async function convertThoughtToTask(thoughtId: string, targetCategory: string): Promise<{ success: boolean }> {
  await connectDB();
  const thought = await BrainDumpThought.findById(thoughtId);
  if (!thought) throw new Error("Thought not found");

  const tz = await getServerTimeZone();
  const todaySprint = await createSprint(isoDate(undefined, tz));
  if (!todaySprint) throw new Error("Could not find or create today's sprint");

  const maxOrderTask = await Task.findOne({ sprintId: todaySprint._id, category: targetCategory })
    .sort({ order: -1 })
    .lean();
  const nextOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

  await Task.create({
    sprintId: todaySprint._id,
    title: thought.text,
    category: targetCategory,
    completed: false,
    order: nextOrder,
  });

  await BrainDumpThought.findByIdAndDelete(thoughtId);

  // Recalculate tasks count on today's sprint
  await recalculateSprint(String(todaySprint._id));

  revalidatePath("/");
  revalidatePath("/brain-dump");
  return { success: true };
}
