import type { Category, CategoryDTO } from "@/types/sprint";

export const DEFAULT_CATEGORIES = [
  { key: "URGENT", label: "Urgent", emoji: "🔴", order: 0 },
  { key: "ADMIN", label: "Admin", emoji: "⚙️", order: 1 },
  { key: "CREATIVE", label: "Creative", emoji: "🎨", order: 2 },
  { key: "DEADLINE", label: "Deadline", emoji: "⏰", order: 3 },
] as const;

const CATEGORY_STYLES = [
  { tone: "text-red-600 dark:text-red-300", ring: "ring-red-500/20" },
  { tone: "text-slate-600 dark:text-slate-300", ring: "ring-slate-500/20" },
  { tone: "text-violet-600 dark:text-violet-300", ring: "ring-violet-500/20" },
  { tone: "text-amber-600 dark:text-amber-300", ring: "ring-amber-500/20" },
  { tone: "text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-500/20" },
  { tone: "text-sky-600 dark:text-sky-300", ring: "ring-sky-500/20" },
  { tone: "text-rose-600 dark:text-rose-300", ring: "ring-rose-500/20" },
  { tone: "text-cyan-600 dark:text-cyan-300", ring: "ring-cyan-500/20" },
];

export function categoryStyle(category: Pick<CategoryDTO, "order"> | { order?: number }) {
  return CATEGORY_STYLES[(category.order ?? 0) % CATEGORY_STYLES.length];
}

export function categoryFallback(category: Category): CategoryDTO {
  const known = DEFAULT_CATEGORIES.find((item) => item.key === category);
  return {
    _id: category,
    key: category,
    label: known?.label ?? titleFromKey(category),
    emoji: known?.emoji ?? "",
    order: known?.order ?? 99,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function titleFromKey(key: string) {
  return key.toLowerCase().replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export const SPRINT_RULES = [
  "Once you start, finish the sprint.",
  "Finish the highlighted task before 9 PM.",
  "Protect one block of deep work.",
];
