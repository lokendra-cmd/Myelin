import { categoryFallback } from "@/lib/constants";
import type { CategoryDTO, TaskDTO } from "@/types/sprint";

/**
 * Tunable weights for My Flow. Scores are a weighted blend of:
 * - frontier: did each executed task match the next planned remaining task?
 * - categoryPath: how cleanly the user moved through categories?
 *
 * Adjust these without touching the UI.
 */
export const MY_FLOW_WEIGHTS = {
  frontier: 0.7,
  categoryPath: 0.3,
} as const;

/**
 * Per-transition quality in [0, 1]. Used by the category-path component.
 * Higher = closer to the intended Category 1 → its tasks → Category 2 → …
 */
export const MY_FLOW_TRANSITION = {
  sameCategory: 1,
  nextAndPreviousDone: 1,
  nextButPreviousOpen: 0.55,
  skippedCategory: 0.3,
  returnedToEarlier: 0.25,
} as const;

export type MyFlowResult = {
  score: number;
  label: string;
  plannedCategoryFlow: string[];
  actualCategoryFlow: string[];
  explanations: string[];
  executedCount: number;
  plannedCount: number;
};

type PlannedTask = {
  id: string;
  categoryKey: string;
  categoryLabel: string;
  categoryIndex: number;
  order: number;
  plannedIndex: number;
};

type ExecutedTask = PlannedTask & {
  at: number;
};

export function myFlowLabel(score: number): string {
  if (score >= 90) return "In Flow";
  if (score >= 75) return "Mostly in Flow";
  if (score >= 50) return "Some Jumping";
  return "Out of Flow";
}

export function calculateMyFlow(categories: CategoryDTO[], tasks: TaskDTO[]): MyFlowResult {
  const { planned, plannedCategoryFlow } = buildPlannedSequence(categories, tasks);
  const executed = buildExecutedSequence(planned, tasks);

  if (planned.length === 0) {
    return {
      score: 100,
      label: "In Flow",
      plannedCategoryFlow: [],
      actualCategoryFlow: [],
      explanations: ["No sequenced tasks for today."],
      executedCount: 0,
      plannedCount: 0,
    };
  }

  if (executed.length === 0) {
    return {
      score: 100,
      label: "In Flow",
      plannedCategoryFlow,
      actualCategoryFlow: [],
      explanations: ["Flow is measured from the tasks you start or complete — unfinished later tasks are not counted."],
      executedCount: 0,
      plannedCount: planned.length,
    };
  }

  const frontierScore = scoreFrontier(planned, executed);
  const { score: categoryPathScore, explanations } = scoreCategoryPath(planned, executed);
  const blended =
    MY_FLOW_WEIGHTS.frontier * frontierScore + MY_FLOW_WEIGHTS.categoryPath * categoryPathScore;
  const score = clampScore(Math.round(100 * blended));

  const actualCategoryFlow = collapseConsecutive(
    executed.map((task) => task.categoryLabel),
  );

  const notes =
    explanations.length > 0
      ? explanations.slice(0, 3)
      : score >= 90
        ? ["You followed today's planned sequence."]
        : ["A few steps landed out of the planned order."];

  return {
    score,
    label: myFlowLabel(score),
    plannedCategoryFlow,
    actualCategoryFlow,
    explanations: notes,
    executedCount: executed.length,
    plannedCount: planned.length,
  };
}

function isFlowCategory(category: Pick<CategoryDTO, "isBrainDump" | "isCaloriesTracker">) {
  return !category.isBrainDump && !category.isCaloriesTracker;
}

function buildPlannedSequence(categories: CategoryDTO[], tasks: TaskDTO[]) {
  const categoryMap = new Map(categories.map((category) => [category.key, category]));

  const usedKeys = new Set<string>();
  for (const task of tasks) {
    if (!usedKeys.has(task.category)) usedKeys.add(task.category);
  }

  const flowCategories = Array.from(usedKeys)
    .map((key) => categoryMap.get(key) ?? categoryFallback(key))
    .filter(isFlowCategory)
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  const categoryIndex = new Map(flowCategories.map((category, index) => [category.key, index]));
  const planned: PlannedTask[] = [];

  for (const category of flowCategories) {
    const categoryTasks = tasks
      .filter((task) => task.category === category.key)
      .sort((a, b) => a.order - b.order || a._id.localeCompare(b._id));

    for (const task of categoryTasks) {
      planned.push({
        id: task._id,
        categoryKey: category.key,
        categoryLabel: category.label,
        categoryIndex: categoryIndex.get(category.key) ?? 0,
        order: task.order,
        plannedIndex: planned.length,
      });
    }
  }

  return {
    planned,
    plannedCategoryFlow: flowCategories
      .filter((category) => planned.some((task) => task.categoryKey === category.key))
      .map((category) => category.label),
  };
}

function buildExecutedSequence(planned: PlannedTask[], tasks: TaskDTO[]): ExecutedTask[] {
  const byId = new Map(planned.map((task) => [task.id, task]));
  const executed: ExecutedTask[] = [];

  for (const task of tasks) {
    const plannedTask = byId.get(task._id);
    if (!plannedTask) continue;

    const at = executionTimestamp(task);
    if (at == null) continue;

    executed.push({ ...plannedTask, at });
  }

  executed.sort((a, b) => a.at - b.at || a.plannedIndex - b.plannedIndex);
  return executed;
}

/**
 * A task counts toward actual flow once it has been started or completed.
 * Future untouched tasks are ignored so incomplete days are not penalized.
 */
function executionTimestamp(task: TaskDTO): number | null {
  if (task.completed) {
    const raw = task.completedAt || task.updatedAt;
    const value = Date.parse(raw);
    return Number.isFinite(value) ? value : 0;
  }
  if (task.startedAt) {
    const value = Date.parse(task.startedAt);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

/**
 * At each executed step, 1.0 means the user picked the next remaining planned task.
 * Picking a later task scores lower in proportion to how far ahead they jumped.
 */
function scoreFrontier(planned: PlannedTask[], executed: ExecutedTask[]): number {
  const remaining = planned.map((task) => task.id);
  const stepScores: number[] = [];

  for (const task of executed) {
    const idx = remaining.indexOf(task.id);
    if (idx < 0) continue;
    const denom = Math.max(1, remaining.length - 1);
    stepScores.push(1 - idx / denom);
    remaining.splice(idx, 1);
  }

  if (stepScores.length === 0) return 1;
  return stepScores.reduce((sum, value) => sum + value, 0) / stepScores.length;
}

function scoreCategoryPath(planned: PlannedTask[], executed: ExecutedTask[]) {
  if (executed.length <= 1) {
    return { score: 1, explanations: [] as string[] };
  }

  const plannedByCategory = new Map<string, string[]>();
  for (const task of planned) {
    const list = plannedByCategory.get(task.categoryKey) ?? [];
    list.push(task.id);
    plannedByCategory.set(task.categoryKey, list);
  }

  const done = new Set<string>();
  const stepScores: number[] = [];
  const explanations: string[] = [];
  const seen = new Set<string>();

  const pushNote = (key: string, text: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    explanations.push(text);
  };

  for (let i = 0; i < executed.length; i++) {
    const current = executed[i];
    const remainingInCategory = (plannedByCategory.get(current.categoryKey) ?? []).filter(
      (id) => !done.has(id) && id !== current.id,
    );
    const earlierStillOpen = remainingInCategory.some((id) => {
      const other = planned.find((task) => task.id === id);
      return other != null && other.order < current.order;
    });
    if (earlierStillOpen) {
      pushNote(
        `order:${current.categoryKey}`,
        `Completed a later task in ${current.categoryLabel} before earlier ones.`,
      );
    }

    if (i > 0) {
      const previous = executed[i - 1];
      const delta = current.categoryIndex - previous.categoryIndex;

      if (delta === 0) {
        stepScores.push(MY_FLOW_TRANSITION.sameCategory);
      } else if (delta === 1) {
        const previousDone = categoryFinished(previous.categoryKey, plannedByCategory, done);
        if (previousDone) {
          stepScores.push(MY_FLOW_TRANSITION.nextAndPreviousDone);
        } else {
          stepScores.push(MY_FLOW_TRANSITION.nextButPreviousOpen);
          pushNote(
            `early:${previous.categoryKey}->${current.categoryKey}`,
            `Started ${current.categoryLabel} before finishing ${previous.categoryLabel}.`,
          );
        }
      } else if (delta > 1) {
        stepScores.push(MY_FLOW_TRANSITION.skippedCategory);
        pushNote(
          `skip:${previous.categoryKey}->${current.categoryKey}`,
          `Moved to ${current.categoryLabel} before finishing earlier categories.`,
        );
      } else {
        stepScores.push(MY_FLOW_TRANSITION.returnedToEarlier);
        pushNote(
          `back:${previous.categoryKey}->${current.categoryKey}`,
          `Returned to ${current.categoryLabel} after starting ${previous.categoryLabel}.`,
        );
      }
    }

    done.add(current.id);
  }

  const score = stepScores.reduce((sum, value) => sum + value, 0) / stepScores.length;
  return { score, explanations };
}

function categoryFinished(
  categoryKey: string,
  plannedByCategory: Map<string, string[]>,
  done: Set<string>,
) {
  const ids = plannedByCategory.get(categoryKey) ?? [];
  return ids.every((id) => done.has(id));
}

function collapseConsecutive(labels: string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    if (out[out.length - 1] !== label) out.push(label);
  }
  return out;
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, value));
}
