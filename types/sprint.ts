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
  isCaloriesTracker?: boolean;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetFat?: number | null;
  targetCarbs?: number | null;
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
  /** Stable identity for recurring habits. Null for one-off tasks. */
  habitId?: string | null;
  completed: boolean;
  isRecurring: boolean;
  recurringDays?: number[];
  recurringStartDate?: string | null;
  recurringEndDate?: string | null;
  untilComplete?: boolean;
  /** Sticky highlight for recurring habits across sprints. */
  highlighted?: boolean;
  deadlineAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  history?: Array<{
    startedAt: string;
    completedAt: string;
  }> | null;
  order: number;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsRange = "7" | "30" | "all" | "custom";

export type HabitStat = {
  habitId: string;
  title: string;
  category: Category;
  categoryLabel: string;
  completedCount: number;
  appearanceCount: number;
  hitRate: number;
  lastCompletedAt: string | null;
  daysSinceLastDone: number | null;
  recurringDays: number[];
};

export type AnalyticsData = {
  range: AnalyticsRange;
  from: string | null;
  to: string | null;
  daily: Array<{ date: string; productivity: number }>;
  categories: Array<{ category: Category; label: string; completed: number; total: number }>;
  calorieTrackers: Array<{
    category: Category;
    label: string;
    mealCount: number;
    totals: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    };
    targets: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    };
    daily: Array<{
      date: string;
      achieved: {
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
      };
      target: {
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
      };
    }>;
  }>;
  dailyCalories: Array<{ date: string; calories: number; target: number }>;
  habits: HabitStat[];
  averageProductivity: number;
  longestStreak: number;
  bestDay: SprintDTO | null;
  worstDay: SprintDTO | null;
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

export type BrainDumpThoughtDTO = {
  _id: string;
  text: string;
  category: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

