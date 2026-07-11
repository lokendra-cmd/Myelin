export type Category = string;

export type CategoryDTO = {
  _id: string;
  key: string;
  label: string;
  emoji: string;
  tagline?: string;
  themeId?: string;
  icon?: string;
  isBrainDump?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type RuleDTO = {
  _id: string;
  id: string;
  text: string;
  icon?: string;
  themeId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskDTO = {
  _id: string;
  sprintId: string;
  title: string;
  category: Category;
  completed: boolean;
  isRecurring: boolean;
  recurringDays?: number[];
  deadlineAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  history?: Array<{
    startedAt: string;
    completedAt: string;
  }> | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type SprintDTO = {
  _id: string;
  date: string;
  title: string;
  completedTasks: number;
  totalTasks: number;
  productivity: number;
  reflection: {
    wentWell: string;
    distracted: string;
    improve: string;
  };
  highlightTaskIds: string[];
  createdAt: string;
  updatedAt: string;
  tasks: TaskDTO[];
};

export type DashboardData = {
  today: SprintDTO | null;
  recent: SprintDTO[];
  currentStreak: number;
};

export type AnalyticsData = {
  daily: Array<{ date: string; productivity: number }>;
  categories: Array<{ category: Category; label: string; completed: number; total: number }>;
  averageProductivity: number;
  longestStreak: number;
  bestDay: SprintDTO | null;
  worstDay: SprintDTO | null;
};

export type BrainDumpThoughtDTO = {
  _id: string;
  text: string;
  category: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

