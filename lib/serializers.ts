import type { CategoryDTO, SprintDTO, TaskDTO, BrainDumpThoughtDTO, RuleDTO } from "@/types/sprint";
import type {
  TaskAttachmentDTO,
  TaskChecklistDTO,
  TaskChecklistItemDTO,
  TaskNoteDTO,
  TaskPlanDTO,
  TaskPlanPageDTO,
  TaskPlanStepDTO,
  TaskPlanSummaryDTO,
} from "@/types/task-plan";

type LeanTask = Record<string, unknown>;
type LeanSprint = Record<string, unknown>;
type LeanCategory = Record<string, unknown>;

export function serializeTask(task: LeanTask): TaskDTO {
  return {
    _id: String(task._id),
    sprintId: String(task.sprintId),
    title: String(task.title ?? ""),
    description: String(task.description ?? ""),
    plan: String(task.plan ?? ""),
    category: task.category as TaskDTO["category"],
    estimatedTimeMinutes:
      task.estimatedTimeMinutes == null || task.estimatedTimeMinutes === ""
        ? null
        : Number(task.estimatedTimeMinutes),
    favorite: Boolean(task.favorite),
    coverImage: task.coverImage ? String(task.coverImage) : null,
    planStepCount: Number(task.planStepCount ?? 0),
    planCompletedStepCount: Number(task.planCompletedStepCount ?? 0),
    habitId: task.habitId ? String(task.habitId) : null,
    completed: Boolean(task.completed),
    isRecurring: Boolean(task.isRecurring),
    recurringDays: Array.isArray(task.recurringDays) ? (task.recurringDays as number[]).map(Number) : [],
    recurringStartDate: task.recurringStartDate ? new Date(task.recurringStartDate as string | Date).toISOString() : null,
    recurringEndDate: task.recurringEndDate ? new Date(task.recurringEndDate as string | Date).toISOString() : null,
    untilComplete: Boolean(task.untilComplete),
    highlighted: Boolean(task.highlighted),
    deadlineAt: task.deadlineAt ? new Date(task.deadlineAt as string | Date).toISOString() : null,
    startedAt: task.startedAt ? new Date(task.startedAt as string | Date).toISOString() : null,
    completedAt: task.completedAt ? new Date(task.completedAt as string | Date).toISOString() : null,
    history: Array.isArray(task.history)
      ? task.history.map((h: unknown) => {
          const item = h as Record<string, unknown>;
          return {
            startedAt: new Date(item.startedAt as string | Date).toISOString(),
            completedAt: new Date(item.completedAt as string | Date).toISOString(),
          };
        })
      : [],
    order: Number(task.order ?? 0),
    calories: task.calories != null ? Number(task.calories) : null,
    protein: task.protein != null ? Number(task.protein) : null,
    fat: task.fat != null ? Number(task.fat) : null,
    carbs: task.carbs != null ? Number(task.carbs) : null,
    createdAt: new Date(task.createdAt as string | Date).toISOString(),
    updatedAt: new Date(task.updatedAt as string | Date).toISOString(),
  };
}

export function serializeTaskPlanSummary(task: LeanTask): TaskPlanSummaryDTO {
  return {
    _id: String(task._id),
    sprintId: String(task.sprintId),
    title: String(task.title ?? ""),
    description: String(task.description ?? ""),
    category: String(task.category ?? ""),
    estimatedTimeMinutes:
      task.estimatedTimeMinutes == null || task.estimatedTimeMinutes === ""
        ? null
        : Number(task.estimatedTimeMinutes),
    favorite: Boolean(task.favorite),
    coverImage: task.coverImage ? String(task.coverImage) : null,
    completed: Boolean(task.completed),
    startedAt: task.startedAt ? new Date(task.startedAt as string | Date).toISOString() : null,
    deadlineAt: task.deadlineAt ? new Date(task.deadlineAt as string | Date).toISOString() : null,
    planStepCount: Number(task.planStepCount ?? 0),
    planCompletedStepCount: Number(task.planCompletedStepCount ?? 0),
    createdAt: new Date(task.createdAt as string | Date).toISOString(),
    updatedAt: new Date(task.updatedAt as string | Date).toISOString(),
  };
}

export function serializePlanStep(step: LeanTask): TaskPlanStepDTO {
  return {
    _id: String(step._id),
    planId: String(step.planId),
    orderIndex: Number(step.orderIndex ?? 0),
    title: String(step.title ?? ""),
    description: String(step.description ?? ""),
    durationMinutes: Number(step.durationMinutes ?? 0),
    icon: String(step.icon ?? "Clipboard"),
    isCompleted: Boolean(step.isCompleted),
    isCollapsed: Boolean(step.isCollapsed),
    createdAt: new Date(step.createdAt as string | Date).toISOString(),
    updatedAt: new Date(step.updatedAt as string | Date).toISOString(),
  };
}

export function serializePlan(plan: LeanTask, steps: LeanTask[] = []): TaskPlanDTO {
  return {
    _id: String(plan._id),
    taskId: String(plan.taskId),
    overview: String(plan.overview ?? ""),
    estimatedTimeMinutes:
      plan.estimatedTimeMinutes == null || plan.estimatedTimeMinutes === ""
        ? null
        : Number(plan.estimatedTimeMinutes),
    createdAt: new Date(plan.createdAt as string | Date).toISOString(),
    updatedAt: new Date(plan.updatedAt as string | Date).toISOString(),
    steps: steps.map(serializePlanStep).sort((a, b) => a.orderIndex - b.orderIndex),
  };
}

export function serializePlanPage(
  task: LeanTask,
  plan: TaskPlanDTO,
  categoryLabel: string,
): TaskPlanPageDTO {
  const total = Number(task.planStepCount ?? plan.steps.length);
  const done = Number(task.planCompletedStepCount ?? plan.steps.filter((s) => s.isCompleted).length);
  return {
    task: serializeTaskPlanSummary(task),
    plan,
    categoryLabel,
    completionPercent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function serializeChecklistItem(item: LeanTask): TaskChecklistItemDTO {
  return {
    _id: String(item._id),
    checklistId: String(item.checklistId),
    title: String(item.title ?? ""),
    completed: Boolean(item.completed),
    orderIndex: Number(item.orderIndex ?? 0),
  };
}

export function serializeChecklist(checklist: LeanTask, items: LeanTask[] = []): TaskChecklistDTO {
  return {
    _id: String(checklist._id),
    taskId: String(checklist.taskId),
    title: String(checklist.title ?? ""),
    orderIndex: Number(checklist.orderIndex ?? 0),
    items: items.map(serializeChecklistItem).sort((a, b) => a.orderIndex - b.orderIndex),
    createdAt: new Date(checklist.createdAt as string | Date).toISOString(),
    updatedAt: new Date(checklist.updatedAt as string | Date).toISOString(),
  };
}

export function serializeNote(note: LeanTask): TaskNoteDTO {
  return {
    _id: String(note._id),
    taskId: String(note.taskId),
    content: String(note.content ?? ""),
    updatedAt: new Date(note.updatedAt as string | Date).toISOString(),
  };
}

export function serializeAttachment(attachment: LeanTask): TaskAttachmentDTO {
  return {
    _id: String(attachment._id),
    taskId: String(attachment.taskId),
    fileName: String(attachment.fileName ?? ""),
    storageUrl: String(attachment.storageUrl ?? ""),
    mimeType: String(attachment.mimeType ?? "application/octet-stream"),
    size: Number(attachment.size ?? 0),
    createdAt: new Date(attachment.createdAt as string | Date).toISOString(),
  };
}

export function serializeCategory(category: LeanCategory): CategoryDTO {
  return {
    _id: String(category._id),
    key: String(category.key ?? ""),
    label: String(category.label ?? ""),
    emoji: String(category.emoji ?? ""),
    tagline: category.tagline ? String(category.tagline) : undefined,
    themeId: category.themeId ? String(category.themeId) : undefined,
    icon: category.icon ? String(category.icon) : undefined,
    isBrainDump: Boolean(category.isBrainDump),
    isCaloriesTracker: Boolean(category.isCaloriesTracker),
    targetCalories: category.targetCalories != null ? Number(category.targetCalories) : null,
    targetProtein: category.targetProtein != null ? Number(category.targetProtein) : null,
    targetFat: category.targetFat != null ? Number(category.targetFat) : null,
    targetCarbs: category.targetCarbs != null ? Number(category.targetCarbs) : null,
    order: Number(category.order ?? 0),
    createdAt: new Date(category.createdAt as string | Date).toISOString(),
    updatedAt: new Date(category.updatedAt as string | Date).toISOString(),
  };
}

type LeanRule = Record<string, unknown>;

export function serializeRule(rule: LeanRule): RuleDTO {
  return {
    _id: String(rule._id),
    id: String(rule._id),
    text: String(rule.text ?? ""),
    icon: rule.icon ? String(rule.icon) : undefined,
    themeId: rule.themeId ? String(rule.themeId) : undefined,
    order: Number(rule.order ?? 0),
    createdAt: new Date(rule.createdAt as string | Date).toISOString(),
    updatedAt: new Date(rule.updatedAt as string | Date).toISOString(),
  };
}

export function serializeSprint(sprint: LeanSprint, tasks: LeanTask[] = []): SprintDTO {
  const reflection = (sprint.reflection ?? {}) as Record<string, string>;
  return {
    _id: String(sprint._id),
    date: String(sprint.date ?? ""),
    title: String(sprint.title ?? ""),
    completedTasks: Number(sprint.completedTasks ?? 0),
    totalTasks: Number(sprint.totalTasks ?? 0),
    productivity: Number(sprint.productivity ?? 0),
    reflection: {
      wentWell: reflection.wentWell ?? "",
      distracted: reflection.distracted ?? "",
      improve: reflection.improve ?? "",
    },
    highlightTaskIds: Array.isArray(sprint.highlightTaskIds)
      ? sprint.highlightTaskIds.map(String)
      : sprint.highlightTaskId
        ? [String(sprint.highlightTaskId)]
        : [],
    createdAt: new Date(sprint.createdAt as string | Date).toISOString(),
    updatedAt: new Date(sprint.updatedAt as string | Date).toISOString(),
    tasks: tasks.map(serializeTask).sort((a, b) => a.order - b.order),
  };
}

export function serializeBrainDumpThought(thought: LeanTask): BrainDumpThoughtDTO {
  return {
    _id: String(thought._id),
    text: String(thought.text ?? ""),
    category: String(thought.category ?? ""),
    order: Number(thought.order ?? 0),
    createdAt: new Date(thought.createdAt as string | Date).toISOString(),
    updatedAt: new Date(thought.updatedAt as string | Date).toISOString(),
  };
}
