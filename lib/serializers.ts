import type { CategoryDTO, SprintDTO, TaskDTO, BrainDumpThoughtDTO } from "@/types/sprint";

type LeanTask = Record<string, unknown>;
type LeanSprint = Record<string, unknown>;
type LeanCategory = Record<string, unknown>;

export function serializeTask(task: LeanTask): TaskDTO {
  return {
    _id: String(task._id),
    sprintId: String(task.sprintId),
    title: String(task.title ?? ""),
    category: task.category as TaskDTO["category"],
    completed: Boolean(task.completed),
    isRecurring: Boolean(task.isRecurring),
    recurringDays: Array.isArray(task.recurringDays) ? (task.recurringDays as number[]).map(Number) : [],
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
    createdAt: new Date(task.createdAt as string | Date).toISOString(),
    updatedAt: new Date(task.updatedAt as string | Date).toISOString(),
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
    order: Number(category.order ?? 0),
    createdAt: new Date(category.createdAt as string | Date).toISOString(),
    updatedAt: new Date(category.updatedAt as string | Date).toISOString(),
  };
}

type LeanRule = Record<string, unknown>;

import type { RuleDTO } from "@/types/sprint";

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
