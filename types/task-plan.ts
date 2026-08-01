/** Lean task fields needed by the Plan page header — avoids shipping full TaskDTO. */
export type TaskPlanSummaryDTO = {
  _id: string;
  sprintId: string;
  title: string;
  description: string;
  category: string;
  estimatedTimeMinutes: number | null;
  favorite: boolean;
  coverImage: string | null;
  completed: boolean;
  startedAt: string | null;
  deadlineAt: string | null;
  planStepCount: number;
  planCompletedStepCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskPlanStepDTO = {
  _id: string;
  planId: string;
  orderIndex: number;
  title: string;
  description: string;
  durationMinutes: number;
  icon: string;
  isCompleted: boolean;
  isCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskPlanDTO = {
  _id: string;
  taskId: string;
  overview: string;
  estimatedTimeMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  steps: TaskPlanStepDTO[];
};

/** Payload for the Plan page — loaded when opening the page. */
export type TaskPlanPageDTO = {
  task: TaskPlanSummaryDTO;
  plan: TaskPlanDTO;
  categoryLabel: string;
  completionPercent: number;
};

export type TaskChecklistItemDTO = {
  _id: string;
  checklistId: string;
  title: string;
  completed: boolean;
  orderIndex: number;
};

export type TaskChecklistDTO = {
  _id: string;
  taskId: string;
  title: string;
  orderIndex: number;
  items: TaskChecklistItemDTO[];
  createdAt: string;
  updatedAt: string;
};

export type TaskNoteDTO = {
  _id: string;
  taskId: string;
  content: string;
  updatedAt: string;
};

export type TaskAttachmentDTO = {
  _id: string;
  taskId: string;
  fileName: string;
  storageUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
};
