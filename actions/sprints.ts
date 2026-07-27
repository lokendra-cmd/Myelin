"use server";

import mongoose from "mongoose";
import { revalidatePath as nextRevalidatePath } from "next/cache";

function revalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch {
    // Suppress invariant error when executing outside request cycle
  }
}
import { DEFAULT_CATEGORIES, SPRINT_RULES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { serializeCategory, serializeSprint, serializeRule, serializeBrainDumpThought } from "@/lib/serializers";
import { categoryInputSchema, categoryUpdateSchema, reorderSchema, sprintUpdateSchema, taskInputSchema, taskUpdateSchema, ruleInputSchema, ruleUpdateSchema } from "@/lib/validations";
import { Category as CategoryModel } from "@/models/Category";
import { Rule as RuleModel } from "@/models/Rule";
import { Sprint } from "@/models/Sprint";
import { Task } from "@/models/Task";
import { BrainDumpThought } from "@/models/BrainDumpThought";
import type { AnalyticsData, AnalyticsRange, Category, CategoryDTO, HabitStat, SprintDTO, RuleDTO, BrainDumpThoughtDTO } from "@/types/sprint";
import { isoDate, formatSprintDate, parseLocalInputValueToUTC } from "@/utils/date";
import { getServerTimeZone } from "@/utils/dateServer";
import { calculateProductivity } from "@/utils/productivity";
import { ensureRecurringHabitIds, newHabitId } from "@/lib/habitId";

async function recalculateSprint(sprintId: string) {
  const calTrackerKeys = await CategoryModel.find({ isCaloriesTracker: true }).distinct("key");
  const excludeMeals = calTrackerKeys.length > 0 ? { category: { $nin: calTrackerKeys } } : {};

  const [completedTasks, totalTasks] = await Promise.all([
    Task.countDocuments({ sprintId, completed: true, ...excludeMeals }),
    Task.countDocuments({ sprintId, ...excludeMeals }),
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

// Batch-load tasks for many sprints in a SINGLE query and group them in memory.
// Avoids the N+1 pattern of running one Task.find() per sprint against remote Atlas.
async function serializeSprintsWithTasks(
  sprints: Array<Record<string, unknown> & { _id: unknown }>,
): Promise<SprintDTO[]> {
  if (sprints.length === 0) return [];
  const ids = sprints.map((sprint) => sprint._id);
  const tasks = await Task.find({ sprintId: { $in: ids } })
    .sort({ category: 1, order: 1 })
    .lean();

  const tasksBySprint = new Map<string, Record<string, unknown>[]>();
  for (const task of tasks) {
    const key = String(task.sprintId);
    const bucket = tasksBySprint.get(key);
    if (bucket) bucket.push(task);
    else tasksBySprint.set(key, [task]);
  }

  return sprints.map((sprint) => serializeSprint(sprint, tasksBySprint.get(String(sprint._id)) ?? []));
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
  const {
    label,
    tagline,
    icon,
    themeId,
    isBrainDump,
    isCaloriesTracker,
    targetCalories,
    targetProtein,
    targetFat,
    targetCarbs,
  } = categoryInputSchema.parse(input);
  const order = await CategoryModel.countDocuments();
  const useTargets = Boolean(isCaloriesTracker);
  const category = await CategoryModel.create({
    key: await uniqueCategoryKey(label),
    label,
    emoji: "",
    tagline: tagline ?? "",
    icon: icon ?? "",
    themeId: themeId ?? "",
    isBrainDump: isBrainDump ?? false,
    isCaloriesTracker: isCaloriesTracker ?? false,
    targetCalories: useTargets ? (targetCalories ?? null) : null,
    targetProtein: useTargets ? (targetProtein ?? null) : null,
    targetFat: useTargets ? (targetFat ?? null) : null,
    targetCarbs: useTargets ? (targetCarbs ?? null) : null,
    order,
  });
  revalidatePath("/");
  return serializeCategory(category.toObject());
}

export async function updateCategory(key: string, input: unknown) {
  await connectDB();
  const {
    label,
    tagline,
    icon,
    themeId,
    isBrainDump,
    isCaloriesTracker,
    targetCalories,
    targetProtein,
    targetFat,
    targetCarbs,
  } = categoryUpdateSchema.parse(input);
  const useTargets = Boolean(isCaloriesTracker);
  const category = await CategoryModel.findOneAndUpdate(
    { key },
    {
      label,
      tagline,
      icon,
      themeId,
      isBrainDump,
      isCaloriesTracker,
      targetCalories: useTargets ? (targetCalories ?? null) : null,
      targetProtein: useTargets ? (targetProtein ?? null) : null,
      targetFat: useTargets ? (targetFat ?? null) : null,
      targetCarbs: useTargets ? (targetCarbs ?? null) : null,
    },
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
  await ensureRecurringHabitIds();
  const tz = await getServerTimeZone();
  const targetDate = date || isoDate(undefined, tz);
  const existing = await Sprint.findOne({ date: targetDate }).lean();
  if (existing) return serializeSprint(existing, await Task.find({ sprintId: existing._id }).lean());

  const title = `Myelination ${formatSprintDate(targetDate)}`;
  const sprint = await Sprint.create({ date: targetDate, title, highlightTaskIds: [] });
  const dayOfWeek = new Date(`${targetDate}T00:00:00Z`).getUTCDay();

  // Roll-forward context from the previous sprint (highlights + until-complete tasks)
  const previousSprint = await Sprint.findOne({
    date: { $lt: targetDate, $ne: "braindump" },
  })
    .sort({ date: -1 })
    .lean();

  const highlightedHabitIds = new Set<string>();
  for (const task of await Task.find({ isRecurring: true, highlighted: true })
    .select({ habitId: 1 })
    .lean()) {
    const habitId = (task as { habitId?: string | null }).habitId;
    if (habitId) highlightedHabitIds.add(habitId);
  }

  // Backfill: habits highlighted on the previous sprint but missing the sticky flag
  if (previousSprint) {
    const prevHighlightIds = normalizeHighlights(previousSprint);
    if (prevHighlightIds.length) {
      const prevHighlighted = await Task.find({ _id: { $in: prevHighlightIds } })
        .select({ habitId: 1 })
        .lean();
      for (const task of prevHighlighted) {
        const habitId = (task as { habitId?: string | null }).habitId;
        if (habitId) highlightedHabitIds.add(habitId);
      }
    }
  }

  // Fetch ALL recurring tasks but deduplicate by habitId (fallback: title+category) so that
  // copies-of-copies from previous sprints don't compound. Keep the first of each unique habit.
  const allRecurring = await Task.find({ isRecurring: true }).sort({ category: 1, order: 1 }).lean();

  const seen = new Set<string>();
  const uniqueRecurring = allRecurring.filter((task) => {
    const key =
      (task as { habitId?: string | null }).habitId ||
      `${task.category}::${String(task.title ?? "").trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const tasksToDuplicate = uniqueRecurring.filter((task) => {
    // Check start date (inclusive)
    if (task.recurringStartDate) {
      const localStart = isoDate(task.recurringStartDate, tz);
      if (targetDate < localStart) return false;
    }
    // Check end date (inclusive)
    if (task.recurringEndDate) {
      const localEnd = isoDate(task.recurringEndDate, tz);
      if (targetDate > localEnd) return false;
    }

    if (!task.recurringDays || task.recurringDays.length === 0) {
      return true;
    }
    return task.recurringDays.includes(dayOfWeek);
  });

  const carriedHighlightTaskIds: string[] = [];

  if (tasksToDuplicate.length) {
    const created = await Task.insertMany(
      tasksToDuplicate.map((task, index) => {
        const habitId = (task as { habitId?: string | null }).habitId || newHabitId();
        const highlighted =
          Boolean((task as { highlighted?: boolean }).highlighted) || highlightedHabitIds.has(habitId);
        return {
          sprintId: sprint._id,
          title: task.title,
          category: task.category,
          habitId,
          completed: false,
          isRecurring: true,
          recurringDays: task.recurringDays || [],
          recurringStartDate: task.recurringStartDate || null,
          recurringEndDate: task.recurringEndDate || null,
          highlighted,
          order: index,
        };
      }),
    );
    for (const task of created) {
      if ((task as { highlighted?: boolean }).highlighted) {
        carriedHighlightTaskIds.push(String(task._id));
      }
    }
  }

  // Roll forward active "Until Complete" tasks from the previous sprint
  if (previousSprint) {
    const prevHighlightIds = new Set(normalizeHighlights(previousSprint));
    const activeUntilCompleteTasks = await Task.find({
      sprintId: previousSprint._id,
      untilComplete: true,
      completed: false,
    });

    if (activeUntilCompleteTasks.length > 0) {
      const eodUTC = parseLocalInputValueToUTC(`${targetDate}T23:59`, tz);
      await Task.updateMany(
        { _id: { $in: activeUntilCompleteTasks.map((t) => t._id) } },
        {
          sprintId: sprint._id,
          deadlineAt: eodUTC ? new Date(eodUTC) : null,
        },
      );
      for (const task of activeUntilCompleteTasks) {
        if (prevHighlightIds.has(String(task._id))) {
          carriedHighlightTaskIds.push(String(task._id));
        }
      }
    }
  }

  if (carriedHighlightTaskIds.length) {
    await Sprint.findByIdAndUpdate(sprint._id, {
      highlightTaskIds: Array.from(new Set(carriedHighlightTaskIds)),
    });
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
  const recent = await serializeSprintsWithTasks(recentDocs);
  const today = recent.find((sprint) => sprint.date === todayDate) ?? (await getSprintByDate(todayDate));
  return { today, recent, currentStreak: getStreak(recent, tz) };
}

export async function getWeeklyReview() {
  await connectDB();
  const docs = await Sprint.find({ date: { $ne: "braindump" } }).sort({ date: -1 }).limit(14).lean();
  return serializeSprintsWithTasks(docs);
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

export type AnalyticsQuery = {
  range?: string;
  from?: string;
  to?: string;
};

function parseAnalyticsRange(query?: AnalyticsQuery): {
  range: AnalyticsRange;
  from: string | null;
  to: string | null;
  dateFilter: Record<string, unknown> | null;
} {
  const raw = query?.range;
  const range: AnalyticsRange =
    raw === "30" || raw === "all" || raw === "custom" || raw === "7" ? raw : "7";

  const dateOk = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

  if (range === "all") {
    return { range, from: null, to: null, dateFilter: null };
  }

  if (range === "custom" && dateOk(query?.from) && dateOk(query?.to)) {
    const from = query!.from!;
    const to = query!.to!;
    return {
      range,
      from,
      to,
      dateFilter: { $gte: from <= to ? from : to, $lte: from <= to ? to : from },
    };
  }

  const days = range === "30" ? 30 : 7;
  // Inclusive window ending today: last N calendar dates.
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const startDate = new Date(`${end}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  const start = startDate.toISOString().slice(0, 10);
  return {
    range: range === "custom" ? "7" : range,
    from: start,
    to: end,
    dateFilter: { $gte: start, $lte: end },
  };
}

function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const from = new Date(`${fromIsoDate}T00:00:00Z`).getTime();
  const to = new Date(`${toIsoDate}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

function buildHabitStats(
  sprints: SprintDTO[],
  categoryLabels: Map<string, string>,
  todayDate: string,
): HabitStat[] {
  type Acc = {
    habitId: string;
    title: string;
    category: string;
    completedCount: number;
    appearanceCount: number;
    lastCompletedAt: string | null;
    recurringDays: number[];
  };

  const byHabit = new Map<string, Acc>();

  for (const sprint of sprints) {
    for (const task of sprint.tasks) {
      if (!task.habitId) continue; // one-offs / until-complete: not habit regularity

      const existing = byHabit.get(task.habitId);
      if (existing) {
        existing.appearanceCount += 1;
        if (task.completed) {
          existing.completedCount += 1;
          if (
            task.completedAt &&
            (!existing.lastCompletedAt || task.completedAt > existing.lastCompletedAt)
          ) {
            existing.lastCompletedAt = task.completedAt;
          }
        }
        // Prefer the newest title (rename-safe display)
        existing.title = task.title;
        existing.category = task.category;
        if (task.recurringDays?.length) existing.recurringDays = task.recurringDays;
      } else {
        byHabit.set(task.habitId, {
          habitId: task.habitId,
          title: task.title,
          category: task.category,
          completedCount: task.completed ? 1 : 0,
          appearanceCount: 1,
          lastCompletedAt: task.completed && task.completedAt ? task.completedAt : null,
          recurringDays: task.recurringDays ?? [],
        });
      }
    }
  }

  return Array.from(byHabit.values())
    .map((habit) => {
      const lastDoneDate = habit.lastCompletedAt
        ? isoDate(habit.lastCompletedAt)
        : null;
      return {
        habitId: habit.habitId,
        title: habit.title,
        category: habit.category,
        categoryLabel: categoryLabels.get(habit.category) ?? habit.category,
        completedCount: habit.completedCount,
        appearanceCount: habit.appearanceCount,
        hitRate: habit.appearanceCount
          ? Math.round((habit.completedCount / habit.appearanceCount) * 100)
          : 0,
        lastCompletedAt: habit.lastCompletedAt,
        daysSinceLastDone: lastDoneDate ? daysBetween(lastDoneDate, todayDate) : null,
        recurringDays: habit.recurringDays,
      };
    })
    .sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel) || a.title.localeCompare(b.title));
}

export async function getAnalytics(query?: AnalyticsQuery): Promise<AnalyticsData> {
  await connectDB();
  await ensureRecurringHabitIds();
  const tz = await getServerTimeZone();
  const todayDate = isoDate(undefined, tz);
  const { range, from, to, dateFilter } = parseAnalyticsRange(
    query?.range === "7" || query?.range === "30" || query?.range === "all" || query?.range === "custom"
      ? query
      : { ...query, range: "7" },
  );

  // Recompute from/to using server timezone for preset ranges so "today" matches the user.
  let resolvedFrom = from;
  let resolvedTo = to;
  let resolvedFilter = dateFilter;
  if (range === "7" || range === "30") {
    const days = range === "30" ? 30 : 7;
    resolvedTo = todayDate;
    const startDate = new Date(`${todayDate}T00:00:00Z`);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    resolvedFrom = startDate.toISOString().slice(0, 10);
    resolvedFilter = { $gte: resolvedFrom, $lte: resolvedTo };
  }

  const categories = await getCategories();
  const sprintQuery: Record<string, unknown> = { date: { $ne: "braindump" } };
  if (resolvedFilter) {
    sprintQuery.date = { $ne: "braindump", ...resolvedFilter };
  }

  const docs = await Sprint.find(sprintQuery).sort({ date: 1 }).lean();
  const sprints = await serializeSprintsWithTasks(docs);
  const categoryLabels = new Map(categories.map((category) => [category.key, category.label]));
  const calorieCategories = categories.filter((category) => category.isCaloriesTracker);
  const calorieCategoryKeys = new Set(calorieCategories.map((category) => category.key));
  const categoryMap = new Map<Category, { completed: number; total: number }>(
    categories
      .filter((category) => !category.isCaloriesTracker)
      .map((category) => [category.key, { completed: 0, total: 0 }]),
  );
  const calorieTrackerMap = new Map<
    Category,
    {
      label: string;
      mealCount: number;
      totals: { calories: number; protein: number; fat: number; carbs: number };
      targets: { calories: number; protein: number; fat: number; carbs: number };
      daily: Array<{
        date: string;
        achieved: { calories: number; protein: number; fat: number; carbs: number };
        target: { calories: number; protein: number; fat: number; carbs: number };
      }>;
    }
  >(
    calorieCategories.map((category) => [
      category.key,
      {
        label: category.label,
        mealCount: 0,
        totals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
        targets: {
          calories: category.targetCalories ?? 0,
          protein: category.targetProtein ?? 0,
          fat: category.targetFat ?? 0,
          carbs: category.targetCarbs ?? 0,
        },
        daily: sprints.map((sprint) => ({
          date: sprint.date.slice(5),
          achieved: { calories: 0, protein: 0, fat: 0, carbs: 0 },
          target: {
            calories: category.targetCalories ?? 0,
            protein: category.targetProtein ?? 0,
            fat: category.targetFat ?? 0,
            carbs: category.targetCarbs ?? 0,
          },
        })),
      },
    ]),
  );
  const dailyTargetCalories = calorieCategories.reduce((sum, category) => sum + (category.targetCalories ?? 0), 0);
  const dailyCalories = sprints.map((sprint) => ({ date: sprint.date.slice(5), calories: 0, target: dailyTargetCalories }));

  for (const [sprintIndex, sprint] of sprints.entries()) {
    for (const task of sprint.tasks) {
      if (calorieCategoryKeys.has(task.category)) {
        const tracker = calorieTrackerMap.get(task.category);
        if (tracker) {
          tracker.mealCount += 1;
          tracker.totals.calories += task.calories ?? 0;
          tracker.totals.protein += task.protein ?? 0;
          tracker.totals.fat += task.fat ?? 0;
          tracker.totals.carbs += task.carbs ?? 0;
          tracker.daily[sprintIndex].achieved.calories += task.calories ?? 0;
          tracker.daily[sprintIndex].achieved.protein += task.protein ?? 0;
          tracker.daily[sprintIndex].achieved.fat += task.fat ?? 0;
          tracker.daily[sprintIndex].achieved.carbs += task.carbs ?? 0;
        }
        dailyCalories[sprintIndex].calories += task.calories ?? 0;
        continue;
      }
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
    range,
    from: resolvedFrom,
    to: resolvedTo,
    daily: sprints.map((sprint) => ({ date: sprint.date.slice(5), productivity: sprint.productivity })),
    categories: Array.from(categoryMap.entries()).map(([category, values]) => ({
      category,
      label: categoryLabels.get(category) ?? category,
      ...values,
    })),
    calorieTrackers: Array.from(calorieTrackerMap.entries())
      .map(([category, values]) => ({ category, ...values }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    dailyCalories,
    habits: buildHabitStats(sprints, categoryLabels, todayDate),
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
  
  const taskData: Record<string, unknown> = { ...data };
  if (data.untilComplete === true) {
    taskData.isRecurring = false;
    taskData.recurringDays = [];
    taskData.recurringStartDate = null;
    taskData.recurringEndDate = null;
    taskData.habitId = null;
  } else if (data.isRecurring === true) {
    const sibling = await Task.findOne({
      isRecurring: true,
      category: data.category,
      title: data.title,
      habitId: { $exists: true, $nin: [null, ""] },
    })
      .select({ habitId: 1 })
      .lean();
    taskData.habitId = (sibling as { habitId?: string } | null)?.habitId || newHabitId();
  }

  await Task.create({ sprintId, ...taskData, order });
  await recalculateSprint(sprintId);
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/analytics");
  return sprintWithTasks(sprintId);
}

export async function updateTask(sprintId: string, taskId: string, input: unknown) {
  await connectDB();
  const data = taskUpdateSchema.parse(input);
  const { highlight, ...rawUpdates } = data;
  const updates: Record<string, unknown> = { ...rawUpdates };

  // Mutually exclusive: untilComplete vs isRecurring
  if (rawUpdates.untilComplete === true) {
    updates.isRecurring = false;
    updates.recurringDays = [];
    updates.recurringStartDate = null;
    updates.recurringEndDate = null;
  } else if (rawUpdates.isRecurring === true) {
    updates.untilComplete = false;
    const current = await Task.findOne({ _id: taskId, sprintId }).lean();
    if (current && !(current as { habitId?: string | null }).habitId) {
      const sibling = await Task.findOne({
        isRecurring: true,
        category: (rawUpdates.category as string) || current.category,
        title: (rawUpdates.title as string) || current.title,
        habitId: { $exists: true, $nin: [null, ""] },
      })
        .select({ habitId: 1 })
        .lean();
      updates.habitId = (sibling as { habitId?: string } | null)?.habitId || newHabitId();
    }
  }

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

  // Keep habit identity consistent across sprints when renaming or changing recurrence.
  const saved = await Task.findById(taskId).lean();
  const habitId = (saved as { habitId?: string | null } | null)?.habitId;
  if (habitId) {
    const sync: Record<string, unknown> = {};
    if (rawUpdates.title !== undefined) sync.title = updates.title;
    if (rawUpdates.category !== undefined) sync.category = updates.category;
    if (rawUpdates.recurringDays !== undefined) sync.recurringDays = updates.recurringDays;
    if (rawUpdates.recurringStartDate !== undefined) sync.recurringStartDate = updates.recurringStartDate;
    if (rawUpdates.recurringEndDate !== undefined) sync.recurringEndDate = updates.recurringEndDate;
    if (rawUpdates.isRecurring !== undefined) sync.isRecurring = updates.isRecurring;
    if (Object.keys(sync).length > 0) {
      await Task.updateMany({ habitId, _id: { $ne: taskId } }, { $set: sync });
    }
  }

  if (highlight !== undefined) {
    const sprint = await Sprint.findById(sprintId).lean<{ highlightTaskIds?: unknown; highlightTaskId?: unknown }>();
    const existing = normalizeHighlights(sprint);
    const highlightTaskIds = highlight ? Array.from(new Set([...existing, taskId])) : existing.filter((id) => id !== taskId);
    await Sprint.findByIdAndUpdate(sprintId, { highlightTaskIds });

    // Sticky highlight for recurring habits — survives into future sprint copies
    await Task.findByIdAndUpdate(taskId, { highlighted: highlight });
    if (habitId && saved && (saved as { isRecurring?: boolean }).isRecurring) {
      await Task.updateMany({ habitId }, { $set: { highlighted: highlight } });
    }
  }
  await recalculateSprint(sprintId);
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/analytics");
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
  return serializeSprintsWithTasks(docs);
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
