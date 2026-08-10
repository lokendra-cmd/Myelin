"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type RefObject } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowDownToLine, ArrowLeft, Calendar, CalendarClock, Check, ChevronDown, CircleDot, FileDown, FileText, GripVertical, History, List, MoreVertical, Pencil, Play, Plus, Repeat, RotateCcw, ShieldCheck, Sparkles, Star, Trash2 } from "lucide-react";
import { TaskActionIcon } from "@/components/tasks/TaskActionIcon";
import { TaskModal } from "@/components/tasks/TaskModal";
import { MealModal } from "@/components/tasks/MealModal";
import { MealItem } from "@/components/tasks/MealItem";
import { NutritionSummary } from "@/components/nutrition-summary";
import { prefetchTaskPlan } from "@/components/task-plan/task-plan-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Confetti } from "@/components/confetti";
import { ProgressRing } from "@/components/progress-ring";
import { EntityModal } from "@/components/entity/EntityModal";
import { DynamicIcon } from "@/components/entity/ModalHeader";
import { OverflowMenu } from "@/components/entity/OverflowMenu";
import { RecurringDialog } from "@/components/tasks/RecurringDialog";
import { hashTheme, getThemeById } from "@/lib/themeUtils";
import { categoryFallback } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useShortcuts } from "@/hooks/use-shortcuts";
import type { Category, CategoryDTO, SprintDTO, TaskDTO, RuleDTO } from "@/types/sprint";
import {
  prettyDate,
  isoDate,
  formatDateTime,
  formatSprintDate,
  formatToLocalInputValue,
  parseLocalInputValueToUTC,
  getUTCTimestamp
} from "@/utils/date";
import { productivityMood } from "@/utils/productivity";
import { sumNutrition } from "@/lib/nutrition";

type DeadlineDraft = {
  enabled: boolean;
  value: string;
};

type ParsedDateTime = {
  year: number;
  month: number;
  day: number;
  time: string;
};

const TIME_OPTIONS = [
  ...Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? "00" : "30";
    const value = `${String(hour).padStart(2, "0")}:${minute}`;
    return { value, label: formatTimeLabel(value) };
  }),
  { value: "23:59", label: "11:59 PM" },
];

export function SprintWorkspace({
  initialSprint,
  initialCategories,
  initialRules = [],
  quickAdd,
  timeZone,
}: {
  initialSprint: SprintDTO;
  initialCategories: CategoryDTO[];
  initialRules?: RuleDTO[];
  quickAdd?: boolean;
  timeZone: string;
}) {
  const [sprint, setSprint] = useState(initialSprint);
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [deadlineDraft, setDeadlineDraft] = useState<Record<string, DeadlineDraft>>({});
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [rules, setRules] = useState<RuleDTO[]>(initialRules);
  const [editingRule, setEditingRule] = useState<RuleDTO | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
  const [recurringTask, setRecurringTask] = useState<TaskDTO | null>(null);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [addTaskCategory, setAddTaskCategory] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const firstInput = useRef<HTMLInputElement | null>(null);
  const categoryDragKeysRef = useRef<string[] | null>(null);
  const draggingCategoryRef = useRef<string | null>(null);
  const highlightTasks = sprint.tasks.filter((task) => sprint.highlightTaskIds.includes(task._id));
  const mood = productivityMood(sprint.productivity);

  useEffect(() => {
    if (quickAdd) firstInput.current?.focus();
  }, [quickAdd]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`sprint:${sprint._id}`, JSON.stringify(sprint));
    }
  }, [sprint]);

  useShortcuts({
    n: () => firstInput.current?.focus(),
    " ": () => {
      const next = sprint.tasks.find((task) => !task.completed);
      if (next) updateTask(next._id, { completed: true });
    },
  });

  const saveReflection = useDebouncedCallback((reflection: SprintDTO["reflection"]) => {
    patchSprint({ reflection });
  }, 500);

  const saveTitle = useDebouncedCallback((title: string) => {
    patchSprint({ title });
  }, 500);

  const saveCategoryName = useDebouncedCallback((key: string, label: string) => {
    if (!label.trim()) return;
    void fetch(`/api/categories/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
  }, 500);

  async function mutate(url: string, init: RequestInit) {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
    const data = await res.json();
    setSprint(data);
  }

  function add(category: Category) {
    const title = draft[category]?.trim();
    if (!title) return;
    const deadlineAt = deadlineDraftToIso(deadlineDraft[category] ?? defaultDeadlineDraft(category, timeZone), timeZone);
    setDraft((current) => ({ ...current, [category]: "" }));
    setDeadlineDraft((current) => ({ ...current, [category]: defaultDeadlineDraft(category, timeZone) }));
    startTransition(() => {
      void mutate(`/api/sprints/${sprint._id}`, {
        method: "POST",
        body: JSON.stringify({ title, category, isRecurring: false, deadlineAt }),
      });
    });
  }

  function handleCategoryCreated(category: CategoryDTO) {
    setCategories((current) => [...current, category]);
  }

  function renameCategory(key: string, label: string) {
    setCategories((current) => current.map((category) => (category.key === key ? { ...category, label } : category)));
    saveCategoryName(key, label);
  }

  async function handleAddRule(label: string, icon?: string) {
    const defaultIcons = ["CheckCircle", "Target", "Sparkles"];
    const chosenIcon = icon || defaultIcons[rules.length % defaultIcons.length];
    const themeId = hashTheme(label).id;
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: label, icon: chosenIcon, themeId }),
    });
    if (!res.ok) throw new Error("Failed to add rule");
    const newRule: RuleDTO = await res.json();
    setRules((current) => [...current, newRule]);
  }

  async function deleteRule(id: string) {
    const res = await fetch(`/api/rules/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete rule");
    setRules((current) => current.filter((rule) => rule._id !== id && rule.id !== id));
  }

  async function handleUpdateRule(id: string, text: string, icon?: string) {
    const ruleToUpdate = rules.find((r) => r._id === id || r.id === id);
    const themeId = ruleToUpdate?.themeId || hashTheme(text).id;
    const res = await fetch(`/api/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, icon, themeId }),
    });
    if (!res.ok) throw new Error("Failed to update rule");
    const updated: RuleDTO = await res.json();
    setRules((current) =>
      current.map((rule) => (rule._id === id || rule.id === id ? updated : rule))
    );
  }

  function deleteCategory(key: string) {
    startTransition(() => {
      void fetch(`/api/categories/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId: sprint._id }),
      }).then(async (res) => {
        if (!res.ok) throw new Error("Could not delete category");
        const nextSprint = await res.json();
        setCategories((current) => current.filter((category) => category.key !== key));
        setDraft((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        if (nextSprint) setSprint(nextSprint);
      });
    });
  }

  function updateTask(taskId: string, updates: Partial<TaskDTO> & { highlight?: boolean }) {
    setSprint((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task._id === taskId ? { ...task, ...updates } : task)),
      highlightTaskIds:
        updates.highlight === undefined
          ? current.highlightTaskIds
          : updates.highlight
            ? Array.from(new Set([...(current.highlightTaskIds ?? []), taskId]))
            : current.highlightTaskIds.filter((id) => id !== taskId),
    }));
    startTransition(() => {
      void mutate(`/api/sprints/${sprint._id}/tasks`, {
        method: "PATCH",
        body: JSON.stringify({ taskId, ...updates }),
      });
    });
  }

  const debouncedTaskTitle = useDebouncedCallback((taskId: string, title: string) => {
    updateTask(taskId, { title });
  }, 500);

  function remove(taskId: string) {
    startTransition(() => {
      void mutate(`/api/sprints/${sprint._id}`, {
        method: "DELETE",
        body: JSON.stringify({ taskId }),
      });
    });
  }

  function patchSprint(updates: Partial<SprintDTO>) {
    startTransition(() => {
      void mutate(`/api/sprints/${sprint._id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    });
  }

  const visibleCategories = useMemo(() => {
    const map = new Map(
      categories
        .filter((c) => !c.isBrainDump)
        .map((category) => [category.key, category])
    );
    for (const task of sprint.tasks) {
      if (!map.has(task.category)) {
        const fb = categoryFallback(task.category);
        if (!fb.isBrainDump) map.set(task.category, fb);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [categories, sprint.tasks]);

  const tasksByCategory = useMemo(() => {
    return visibleCategories.reduce<Record<Category, TaskDTO[]>>((acc, category) => {
      acc[category.key] = sprint.tasks.filter((task) => task.category === category.key).sort((a, b) => a.order - b.order);
      return acc;
    }, {} as Record<Category, TaskDTO[]>);
  }, [sprint.tasks, visibleCategories]);

  const dailyNutritionTotals = useMemo(() => {
    const mealTasks = sprint.tasks.filter((task) => {
      const cat = categories.find((c) => c.key === task.category);
      return cat?.isCaloriesTracker;
    });
    return sumNutrition(mealTasks);
  }, [sprint.tasks, categories]);

  const hasCaloriesTracker = useMemo(
    () => categories.some((c) => c.isCaloriesTracker),
    [categories],
  );

  function onDrop(category: Category, targetId?: string) {
    if (!dragging) return;
    const moved = sprint.tasks.find((task) => task._id === dragging);
    if (!moved) return;
    const categoryTasks = (tasksByCategory[category] ?? []).filter((task) => task._id !== dragging);
    const targetIndex = targetId ? categoryTasks.findIndex((task) => task._id === targetId) : categoryTasks.length;
    categoryTasks.splice(Math.max(targetIndex, 0), 0, { ...moved, category });
    const taskIds = categoryTasks.map((task) => task._id);
    setDragging(null);
    setSprint((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        const order = taskIds.indexOf(task._id);
        return order >= 0 ? { ...task, category, order } : task;
      }),
    }));
    startTransition(() => {
      void mutate(`/api/sprints/${sprint._id}`, { method: "PUT", body: JSON.stringify({ taskIds }) });
      if (moved.category !== category) updateTask(moved._id, { category });
    });
  }

  function onCategoryDragStart(key: string) {
    setDragging(null);
    draggingCategoryRef.current = key;
    setDraggingCategory(key);
    categoryDragKeysRef.current = null;
  }

  function onCategoryDragOver(overKey: string) {
    const activeKey = draggingCategoryRef.current;
    if (!activeKey || activeKey === overKey) return;
    setCategories((current) => {
      const sortable = current.filter((c) => !c.isBrainDump);
      const from = sortable.findIndex((c) => c.key === activeKey);
      const to = sortable.findIndex((c) => c.key === overKey);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...sortable];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const orderMap = new Map(next.map((c, i) => [c.key, i]));
      categoryDragKeysRef.current = next.map((c) => c.key);
      return current.map((c) => (orderMap.has(c.key) ? { ...c, order: orderMap.get(c.key)! } : c));
    });
  }

  function onCategoryDragEnd() {
    const keys = categoryDragKeysRef.current;
    draggingCategoryRef.current = null;
    setDraggingCategory(null);
    categoryDragKeysRef.current = null;
    if (!keys?.length) return;
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryKeys: keys }),
          });
          if (!res.ok) return;
          const updated = (await res.json()) as CategoryDTO[];
          setCategories(updated);
        } catch {
          // Keep optimistic order; next refresh will reconcile.
        }
      })();
    });
  }

  const displayTitle = sprint.title.startsWith("Sprint ") || sprint.title.startsWith("Myelination ")
    ? `Myelination ${formatSprintDate(sprint.date)}`
    : sprint.title;

  const progressPanel = (
    <Card className="rounded-2xl p-4 sm:p-6">
      <div className="flex items-center gap-4 lg:block">
        <div className="relative shrink-0 lg:mx-auto lg:grid lg:place-items-center">
          <ProgressRing value={sprint.productivity} size={112} showLabel={false} className="lg:hidden" />
          <ProgressRing value={sprint.productivity} className="hidden lg:grid" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center lg:hidden">
            <div className="text-2xl font-bold tabular-nums">{sprint.productivity}%</div>
          </div>
        </div>
        <div className="min-w-0 flex-1 lg:mt-4 lg:text-center">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            <span className="mr-1.5">{mood.emoji}</span>
            {mood.label}
          </div>
          <div className="mt-3 inline-flex rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 lg:mt-4 lg:w-full lg:justify-center lg:rounded-md lg:px-3 lg:py-3 lg:text-sm">
            Completed{" "}
            <span className="ml-1 font-bold text-zinc-950 dark:text-zinc-50">
              {sprint.completedTasks} / {sprint.totalTasks}
            </span>
          </div>
          {hasCaloriesTracker && dailyNutritionTotals.calories > 0 && (
            <div className="mt-3 lg:mt-4">
              <NutritionSummary totals={dailyNutritionTotals} variant="inline" className="justify-center lg:w-full" />
            </div>
          )}
        </div>
      </div>
      {hasCaloriesTracker && (
        <div className="mt-4">
          <NutritionSummary totals={dailyNutritionTotals} variant="panel" />
        </div>
      )}
    </Card>
  );

  const highlightsPanel = (
    <Card className="rounded-2xl p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <Star className="size-4 text-accent" />
        Highlight Tasks
      </p>
      <div className="mt-3 rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
        {highlightTasks.length ? (
          <>
            <p className="text-base font-semibold sm:text-lg">
              {highlightTasks.filter((task) => task.completed).length === highlightTasks.length
                ? "🎉 All highlights completed"
                : "Active highlights"}
            </p>
            <p className="mt-2 text-sm text-zinc-500">{highlightTasks.map((task) => task.title).join(" · ")}</p>
          </>
        ) : (
          <p className="text-sm text-zinc-500">Choose one or more tasks to keep in focus.</p>
        )}
      </div>
    </Card>
  );

  const reflectionPanel = (
    <Card className="rounded-2xl p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <Pencil className="size-4 text-accent" />
        End of Day
      </p>
      <div className="mt-3 space-y-3">
        {(
          [
            ["wentWell", "What went well?"],
            ["distracted", "What distracted you?"],
            ["improve", "What can improve tomorrow?"],
          ] as const
        ).map(([key, label]) => (
          <Textarea
            key={key}
            placeholder={label}
            value={sprint.reflection[key]}
            onChange={(event) => {
              const reflection = { ...sprint.reflection, [key]: event.target.value };
              setSprint({ ...sprint, reflection });
              saveReflection(reflection);
            }}
          />
        ))}
      </div>
    </Card>
  );

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6">
      <Confetti active={sprint.productivity === 100 && sprint.totalTasks > 0} />

      {/* Mobile back + export */}
      <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="size-4" />
          Today
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" title="Markdown export">
            <Link href={`/api/sprints/${sprint._id}/markdown?tz=${encodeURIComponent(timeZone)}`}>
              <FileText className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" title="PDF export">
            <Link href={`/api/sprints/${sprint._id}/pdf?tz=${encodeURIComponent(timeZone)}`}>
              <FileDown className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-5 flex min-w-0 flex-col gap-4 lg:mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">{prettyDate(sprint.date, "long", timeZone)}</p>
          <input
            value={displayTitle}
            onChange={(event) => {
              setSprint({ ...sprint, title: event.target.value });
              saveTitle(event.target.value);
            }}
            className="mt-1 w-full min-w-0 bg-transparent text-[1.75rem] font-bold tracking-tight outline-none sm:text-4xl sm:font-semibold"
          />
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="subtle" size="sm">
            <Link href={`/api/sprints/${sprint._id}/markdown?tz=${encodeURIComponent(timeZone)}`}>
              <ArrowDownToLine className="size-4" />
              Markdown
            </Link>
          </Button>
          <Button asChild variant="subtle" size="sm">
            <Link href={`/api/sprints/${sprint._id}/pdf?tz=${encodeURIComponent(timeZone)}`}>
              <FileDown className="size-4" />
              PDF
            </Link>
          </Button>
        </div>
      </div>

      {/* Progress first on mobile */}
      <div className="mb-5 lg:hidden">{progressPanel}</div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-5 sm:space-y-6">
          {/* Daily Rules */}
          <Card className="min-w-0 overflow-hidden rounded-2xl p-4 sm:p-6">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Daily Rules</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Principles that guide me every day.</p>
                </div>
              </div>
              <button
                onClick={() => setRuleModalOpen(true)}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent transition hover:brightness-90 sm:h-9 sm:rounded-lg sm:border sm:border-zinc-200 sm:bg-white sm:px-4 sm:text-violet-600 sm:shadow-sm sm:hover:border-violet-300 sm:hover:bg-violet-50/50 dark:sm:border-zinc-800 dark:sm:bg-zinc-900 dark:sm:text-violet-400"
              >
                <Plus className="size-3.5" />
                <span className="sm:hidden">Add Rule</span>
                <span className="hidden sm:inline">Add New Rule</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:mt-5 md:grid-cols-2 md:gap-4">
              {rules.map((rule) => {
                const theme = hashTheme(rule.id);
                const getLineColor = (themeId: string) => {
                  switch (themeId) {
                    case "forest": return "bg-emerald-500";
                    case "ocean": return "bg-blue-500";
                    case "sky": return "bg-sky-500";
                    case "sunset": return "bg-orange-500";
                    case "peach": return "bg-rose-400";
                    case "rose": return "bg-rose-500";
                    case "lavender": return "bg-violet-500";
                    case "indigo": return "bg-indigo-500";
                    case "sand": return "bg-amber-500";
                    case "mint": return "bg-teal-500";
                    case "slate": return "bg-slate-500";
                    case "coral": return "bg-red-500";
                    case "stone": return "bg-stone-500";
                    case "lemon": return "bg-lime-500";
                    case "emerald": return "bg-emerald-500";
                    case "teal": return "bg-teal-500";
                    case "blue": return "bg-blue-500";
                    case "purple": return "bg-purple-500";
                    default: return "bg-accent";
                  }
                };

                return (
                  <div
                    key={rule.id}
                    className="group relative flex min-h-0 min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-zinc-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 sm:min-h-[108px] sm:gap-3.5 sm:p-4"
                  >
                    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/50 dark:border-zinc-800 sm:size-12 sm:rounded-[20px]", theme.accentBg)}>
                      <DynamicIcon name={rule.icon} className={cn("size-5", theme.accentText)} fallback={ShieldCheck} />
                    </div>

                    <span className="min-w-0 flex-1 break-words pr-6 text-[13px] font-medium leading-relaxed text-zinc-800 line-clamp-3 dark:text-zinc-200">
                      {rule.text}
                    </span>

                    <OverflowMenu
                      menuOpen={activeMenuId === rule.id}
                      onMenuOpenChange={(open) => setActiveMenuId(open ? rule.id : null)}
                      onEdit={() => setEditingRule(rule)}
                      onDelete={() => deleteRule(rule.id)}
                      deleteConfirmTitle="Delete this rule?"
                      deleteConfirmSubtext="This action cannot be undone."
                      className="absolute right-2 top-2"
                    />

                    <div className={cn("absolute bottom-0 left-4 h-[3.5px] w-14 rounded-t-full", getLineColor(theme.id))} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* My Categories Header */}
          <div className="mt-2 flex min-w-0 items-start justify-between gap-3 sm:mt-4">
            <div className="min-w-0 space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                My Categories
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Organize your work into focused spaces.
              </p>
            </div>
            <motion.button
              onClick={() => setCategoryModalOpen(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-white px-3 py-2 text-sm font-medium text-accent shadow-sm transition-colors hover:bg-accent-soft dark:border-accent/40 dark:bg-zinc-900"
              aria-label="Create new category"
            >
              <Sparkles className="size-3.5" />
              New Category
            </motion.button>
          </div>

          {/* Reusable Category Modal */}
          <EntityModal
            open={categoryModalOpen || !!editingCategory}
            onOpenChange={(open) => {
              if (!open) {
                setCategoryModalOpen(false);
                setEditingCategory(null);
              }
            }}
            entityType="category"
            title={editingCategory ? "Edit Category" : "Create New Category"}
            submitLabel={editingCategory ? "Save Changes" : "Create Category"}
            description={editingCategory ? "Update category information." : "Create a category to group your tasks."}
            initialValues={
              editingCategory
                ? {
                    label: editingCategory.label,
                    tagline: editingCategory.tagline || "",
                    icon: editingCategory.icon || "",
                    isBrainDump: !!editingCategory.isBrainDump,
                    isCaloriesTracker: !!editingCategory.isCaloriesTracker,
                    targetCalories: editingCategory.targetCalories ?? undefined,
                    targetProtein: editingCategory.targetProtein ?? undefined,
                    targetFat: editingCategory.targetFat ?? undefined,
                    targetCarbs: editingCategory.targetCarbs ?? undefined,
                  }
                : null
            }
            onSubmit={async (values) => {
              const useTargets = !!values.isCaloriesTracker;
              if (editingCategory) {
                const body = {
                  label: values.label,
                  tagline: values.tagline || "",
                  icon: values.icon,
                  themeId: editingCategory.themeId || hashTheme(values.label).id,
                  isBrainDump: !!values.isBrainDump,
                  isCaloriesTracker: !!values.isCaloriesTracker,
                  targetCalories: useTargets ? (values.targetCalories ?? null) : null,
                  targetProtein: useTargets ? (values.targetProtein ?? null) : null,
                  targetFat: useTargets ? (values.targetFat ?? null) : null,
                  targetCarbs: useTargets ? (values.targetCarbs ?? null) : null,
                };
                const res = await fetch(`/api/categories/${encodeURIComponent(editingCategory.key)}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error("Failed to update category");
                const updated = await res.json();

                setCategories((current) =>
                  current.map((cat) =>
                    cat.key === editingCategory.key
                      ? {
                          ...cat,
                          label: updated.label,
                          tagline: updated.tagline,
                          icon: updated.icon,
                          themeId: updated.themeId,
                          isBrainDump: updated.isBrainDump,
                          isCaloriesTracker: updated.isCaloriesTracker,
                          targetCalories: updated.targetCalories,
                          targetProtein: updated.targetProtein,
                          targetFat: updated.targetFat,
                          targetCarbs: updated.targetCarbs,
                        }
                      : cat
                  )
                );
                setEditingCategory(null);
              } else {
                const body = {
                  label: values.label,
                  tagline: values.tagline || "",
                  icon: values.icon,
                  themeId: hashTheme(values.label).id,
                  isBrainDump: !!values.isBrainDump,
                  isCaloriesTracker: !!values.isCaloriesTracker,
                  targetCalories: useTargets ? (values.targetCalories ?? null) : null,
                  targetProtein: useTargets ? (values.targetProtein ?? null) : null,
                  targetFat: useTargets ? (values.targetFat ?? null) : null,
                  targetCarbs: useTargets ? (values.targetCarbs ?? null) : null,
                };
                const res = await fetch("/api/categories", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error("Failed to create category");
                const created = await res.json();
                handleCategoryCreated(created);
                setCategoryModalOpen(false);
              }
            }}
          />

          {/* Reusable Rule Modal */}
          <EntityModal
            open={ruleModalOpen}
            onOpenChange={setRuleModalOpen}
            entityType="rule"
            title="New Rule"
            description="Add a principle to guide your focus."
            defaultIconName="CheckCircle"
            defaultIcon={ShieldCheck}
            onSubmit={async (values) => {
              await handleAddRule(values.label, values.icon);
              setRuleModalOpen(false);
            }}
          />

          {/* Edit Rule Modal */}
          <EntityModal
            open={!!editingRule}
            onOpenChange={(open) => {
              if (!open) setEditingRule(null);
            }}
            entityType="rule"
            title="Edit Rule"
            submitLabel="Save Changes"
            description="Update this rule and icon."
            initialValues={
              editingRule
                ? {
                    label: editingRule.text,
                    tagline: "",
                    icon: editingRule.icon,
                  }
                : null
            }
            onSubmit={async (values) => {
              if (editingRule) {
                await handleUpdateRule(editingRule.id, values.label, values.icon);
                setEditingRule(null);
              }
            }}
          />

          {/* Recurring Task Dialog */}
          <RecurringDialog
            task={recurringTask}
            open={!!recurringTask}
            onOpenChange={(open) => {
              if (!open) setRecurringTask(null);
            }}
            timeZone={timeZone}
            onSave={async (recurringDays, recurringStartDate, recurringEndDate, untilComplete) => {
              if (recurringTask) {
                const isRecurring = recurringDays.length > 0;
                await updateTask(recurringTask._id, {
                  isRecurring,
                  recurringDays,
                  recurringStartDate,
                  recurringEndDate,
                  untilComplete,
                });
                setRecurringTask(null);
              }
            }}
          />

          {/* Edit Task / Meal Modal */}
          {editingTask && (() => {
            const editCategory = categories.find((c) => c.key === editingTask.category);
            if (editCategory?.isCaloriesTracker) {
              return (
                <MealModal
                  mode="edit"
                  open={!!editingTask}
                  onOpenChange={(open) => { if (!open) setEditingTask(null); }}
                  task={editingTask}
                  onSaved={(taskId, updates) => {
                    updateTask(taskId, updates);
                    setEditingTask(null);
                  }}
                />
              );
            }
            return (
              <TaskModal
                mode="edit"
                open={!!editingTask}
                onOpenChange={(open) => { if (!open) setEditingTask(null); }}
                task={editingTask}
                onSaved={(taskId, updates) => {
                  updateTask(taskId, updates);
                  setEditingTask(null);
                }}
              />
            );
          })()}

          {/* Add Task / Meal Modal (per-category) */}
          {addTaskCategory && (() => {
            const addCategory = categories.find((c) => c.key === addTaskCategory);
            if (addCategory?.isCaloriesTracker) {
              return (
                <MealModal
                  mode="create"
                  open={!!addTaskCategory}
                  onOpenChange={(open) => { if (!open) setAddTaskCategory(null); }}
                  category={addTaskCategory}
                  sprintId={sprint._id}
                  onCreated={(updatedSprint) => {
                    setSprint(updatedSprint);
                    setAddTaskCategory(null);
                  }}
                />
              );
            }
            return (
              <TaskModal
                mode="create"
                open={!!addTaskCategory}
                onOpenChange={(open) => { if (!open) setAddTaskCategory(null); }}
                category={addTaskCategory}
                sprintId={sprint._id}
                onCreated={(updatedSprint) => {
                  setSprint(updatedSprint);
                  setAddTaskCategory(null);
                }}
              />
            );
          })()}

          <div className="min-w-0 space-y-3 sm:space-y-6">
            {visibleCategories.map((category, index) => (
              <TaskSection
                key={category.key}
                category={category}
                tasks={tasksByCategory[category.key] ?? []}
                firstInput={index === 0 ? firstInput : undefined}
                draft={draft[category.key] ?? ""}
                deadlineDraft={deadlineDraft[category.key] ?? defaultDeadlineDraft(category.key, timeZone)}
                dragging={dragging}
                draggingCategory={draggingCategory}
                canReorderCategory={categories.some((c) => c.key === category.key && !c.isBrainDump)}
                onDraft={(value) => setDraft((current) => ({ ...current, [category.key]: value }))}
                onDeadlineDraft={(value) => setDeadlineDraft((current) => ({ ...current, [category.key]: value }))}
                onAdd={() => add(category.key)}
                onAddTask={() => setAddTaskCategory(category.key)}
                onRename={(label) => renameCategory(category.key, label)}
                onEditCategory={() => setEditingCategory(category)}
                onDeleteCategory={() => deleteCategory(category.key)}
                onUpdate={updateTask}
                onDelete={remove}
                onEdit={setEditingTask}
                onDrag={setDragging}
                onDrop={onDrop}
                onCategoryDragStart={onCategoryDragStart}
                onCategoryDragOver={onCategoryDragOver}
                onCategoryDragEnd={onCategoryDragEnd}
                highlightTaskIds={sprint.highlightTaskIds}
                pending={isPending}
                activeMenuId={activeMenuId}
                onActiveMenuIdChange={setActiveMenuId}
                debouncedTaskTitle={debouncedTaskTitle}
                onConfigureRecurring={setRecurringTask}
                timeZone={timeZone}
              />
            ))}
          </div>

          {/* Highlights + reflection after categories on mobile */}
          <div className="space-y-4 pt-1 lg:hidden">
            {highlightsPanel}
            {reflectionPanel}
          </div>
        </section>

        <aside className="hidden min-w-0 space-y-6 lg:block">
          {progressPanel}
          {highlightsPanel}
          {reflectionPanel}
        </aside>
      </div>
    </main>
  );
}

function TaskItem({
  task,
  category,
  highlightTaskIds,
  onUpdate,
  onDelete,
  onEdit,
  onDrag,
  onDrop,
  debouncedTaskTitle,
  dragging,
  onConfigureRecurring,
  timeZone,
}: {
  task: TaskDTO;
  category: CategoryDTO;
  highlightTaskIds: string[];
  onUpdate: (taskId: string, updates: Partial<TaskDTO> & { highlight?: boolean }) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: TaskDTO) => void;
  onDrag: (taskId: string | null) => void;
  onDrop: (category: Category, targetId?: string) => void;
  debouncedTaskTitle: (taskId: string, title: string) => void;
  dragging: string | null;
  onConfigureRecurring: (task: TaskDTO) => void;
  timeZone: string;
}) {
  const isCompleted = task.completed;
  const isInProgress = !task.completed && !!task.startedAt;
  const isBeforeStarting = !task.completed && !task.startedAt;

  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"none" | "start-again" | "delete">("none");
  const hasPlan = Boolean(task.planStepCount) || Boolean(task.plan?.trim());

  useEffect(() => {
    if (!menuOpen) setConfirmMode("none");
  }, [menuOpen]);

  let statusIcon;
  if (isCompleted) {
    statusIcon = (
      <div className="size-10 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/30 shrink-0">
        <Check className="size-5" />
      </div>
    );
  } else if (isInProgress) {
    statusIcon = (
      <div className="size-10 rounded-full flex items-center justify-center bg-emerald-50/70 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/20 shrink-0">
        <Activity className="size-5 animate-pulse text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  } else {
    statusIcon = (
      <div className="size-10 rounded-full flex items-center justify-center bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 shrink-0">
        <FileText className="size-5" />
      </div>
    );
  }

  let actionButton = null;
  if (isInProgress) {
    actionButton = (
      <Button
        variant="subtle"
        size="sm"
        onClick={() => onUpdate(task._id, { completed: true })}
        className="h-9 shrink-0 border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 dark:border-emerald-800 dark:bg-zinc-950 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
      >
        <Check className="size-3.5" /> Mark Complete
      </Button>
    );
  } else if (isBeforeStarting) {
    actionButton = (
      <Button
        size="sm"
        onClick={() => onUpdate(task._id, { startedAt: getUTCTimestamp() })}
        className="h-9 shrink-0 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        <Play className="size-3 fill-current" /> Start Task
      </Button>
    );
  }

  const isFeaturedMobile = isInProgress && !isCompleted;
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  function handleStartAgainConfirmed() {
    setMenuOpen(false);
    setConfirmMode("none");
    onUpdate(task._id, { completed: false, startedAt: null, completedAt: null });
  }

  function handleDeleteConfirmed() {
    setMenuOpen(false);
    setConfirmMode("none");
    onDelete(task._id);
  }

  const metaBadges = (
    <>
      {task.isRecurring && (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-100/60 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:border-violet-900/30 dark:bg-violet-950/30 dark:text-violet-400">
          <Repeat className="size-3" />
          Recurring
        </span>
      )}
      {task.untilComplete && (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-100/60 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-400">
          <CircleDot className="size-3" />
          Until Complete
        </span>
      )}
      {isInProgress && (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100/50 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
          In Progress
        </span>
      )}
    </>
  );

  const menuItemClass =
    "flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-xs outline-none transition hover:bg-zinc-100 focus:bg-zinc-100 data-[highlighted]:bg-zinc-100 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900 dark:data-[highlighted]:bg-zinc-900";

  const moreMenu = (
    <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          title="Actions"
          className="grid size-8 place-items-center rounded-full text-zinc-400 outline-none transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-xl ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 animate-in fade-in-50 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 duration-100"
        >
          {confirmMode === "none" && (
            <div className="py-0.5">
              {!isCompleted && (
                <>
                  <DropdownMenu.Item asChild>
                    <Link
                      href={`/sprints/${task.sprintId}/tasks/${task._id}`}
                      onMouseEnter={() => prefetchTaskPlan(task._id)}
                      onFocus={() => prefetchTaskPlan(task._id)}
                      className={cn(menuItemClass, "text-emerald-700 dark:text-emerald-400")}
                    >
                      <List className="size-3.5" />
                      Open Plan
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => onEdit(task)}
                    className={cn(menuItemClass, "text-zinc-700 dark:text-zinc-300")}
                  >
                    <Pencil className="size-3.5" />
                    Edit Task
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() =>
                      onUpdate(task._id, { highlight: !highlightTaskIds.includes(task._id) })
                    }
                    className={cn(menuItemClass, "text-zinc-700 dark:text-zinc-300")}
                  >
                    <Star className="size-3.5" />
                    {highlightTaskIds.includes(task._id) ? "Remove Highlight" : "Highlight"}
                  </DropdownMenu.Item>
                </>
              )}
              {isCompleted && (
                <>
                  <DropdownMenu.Item asChild>
                    <Link
                      href={`/sprints/${task.sprintId}/tasks/${task._id}`}
                      onMouseEnter={() => prefetchTaskPlan(task._id)}
                      onFocus={() => prefetchTaskPlan(task._id)}
                      className={cn(menuItemClass, "text-emerald-700 dark:text-emerald-400")}
                    >
                      <List className="size-3.5" />
                      Open Plan
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => setHistoryOpen(true)}
                    className={cn(menuItemClass, "text-zinc-700 dark:text-zinc-300")}
                  >
                    <History className="size-3.5" />
                    View History
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={(event) => {
                      event.preventDefault();
                      setConfirmMode("start-again");
                    }}
                    className={cn(menuItemClass, "text-zinc-700 dark:text-zinc-300")}
                  >
                    <RotateCcw className="size-3.5" />
                    Start Again
                  </DropdownMenu.Item>
                </>
              )}
              <DropdownMenu.Item
                onSelect={(event) => {
                  event.preventDefault();
                  setConfirmMode("delete");
                }}
                className={cn(menuItemClass, "font-medium text-red-600 dark:text-red-400")}
              >
                <Trash2 className="size-3.5" />
                Delete Task
              </DropdownMenu.Item>
            </div>
          )}
          {confirmMode === "start-again" && (
            <div className="p-3">
              <p className="text-xs font-semibold">Start a new session?</p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmMode("none")}
                  className="rounded-md px-2.5 py-1.5 text-[11px] text-zinc-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartAgainConfirmed}
                  className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                >
                  Start Again
                </button>
              </div>
            </div>
          )}
          {confirmMode === "delete" && (
            <div className="p-3">
              <p className="text-xs font-semibold">Delete this task?</p>
              <p className="mt-1 text-[10px] text-zinc-400">This cannot be undone.</p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmMode("none")}
                  className="rounded-md px-2.5 py-1.5 text-[11px] text-zinc-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirmed}
                  className="rounded-md bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  return (
    <>
      {!isDesktop && isFeaturedMobile && (
        <motion.div
          layout
          className={cn(
            "relative min-w-0 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
            menuOpen ? "z-30 overflow-visible" : "overflow-hidden",
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            {statusIcon}
            <div className="min-w-0 flex-1">
              <input
                defaultValue={task.title}
                onChange={(event) => debouncedTaskTitle(task._id, event.target.value)}
                className="w-full bg-transparent text-[15px] font-semibold text-zinc-900 outline-none dark:text-zinc-50"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {task.deadlineAt && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                    <Calendar className="size-3.5" />
                    {formatDateTime(task.deadlineAt, "full", timeZone)}
                  </span>
                )}
                {metaBadges}
              </div>
            </div>
          </div>

          {task.deadlineAt && (
            <div className="mt-4 rounded-xl bg-zinc-50 px-3 py-3 dark:bg-zinc-900/60">
              <TaskCountdown deadlineAt={task.deadlineAt} />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            {actionButton}
            <div className="flex items-center gap-1">
              <TaskActionIcon
                icon={Repeat}
                tooltip="Recurrence"
                active={task.untilComplete || task.isRecurring}
                activeColor="violet"
                onClick={() => onConfigureRecurring(task)}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
              <DeadlinePickerBox
                value={task.deadlineAt ? formatToLocalInputValue(task.deadlineAt, timeZone) : ""}
                onChange={(value) => onUpdate(task._id, { deadlineAt: parseLocalInputValueToUTC(value, timeZone) })}
                timeZone={timeZone}
                customTrigger={
                  <TaskActionIcon
                    icon={Calendar}
                    tooltip="Deadline"
                    active={!!task.deadlineAt}
                    activeColor="violet"
                    className="bg-zinc-50 dark:bg-zinc-900"
                  />
                }
              />
              {moreMenu}
            </div>
          </div>
        </motion.div>
      )}

      {!isDesktop && !isFeaturedMobile && (
        <motion.div
          layout
          className={cn(
            "relative min-w-0 rounded-2xl border bg-white p-3.5 shadow-sm dark:bg-zinc-950",
            menuOpen ? "z-30 overflow-visible" : "overflow-hidden",
            isCompleted
              ? "border-emerald-100/70 dark:border-emerald-950/30"
              : "border-zinc-200/90 dark:border-zinc-800",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 scale-90">{statusIcon}</div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <input
                  defaultValue={task.title}
                  onChange={(event) => debouncedTaskTitle(task._id, event.target.value)}
                  className={cn(
                    "min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none",
                    isCompleted
                      ? "text-zinc-400 line-through dark:text-zinc-600"
                      : "text-zinc-900 dark:text-zinc-50",
                  )}
                  disabled={isCompleted}
                />
                {isCompleted && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <Check className="size-3" />
                    Completed
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {isCompleted ? (
                  <span className="text-[11px] text-zinc-400">
                    Completed at {formatDateTime(task.completedAt || task.updatedAt, "time", timeZone)}
                  </span>
                ) : null}
                {metaBadges}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {isBeforeStarting && actionButton}
              {moreMenu}
            </div>
          </div>
        </motion.div>
      )}

      {isDesktop && (
      <motion.div
        layout
        draggable
        onDragStart={() => onDrag(task._id)}
        onDragEnd={() => onDrag(null)}
        onDrop={(event) => {
          event.stopPropagation();
          onDrop(category.key, task._id);
        }}
        className={cn(
          "group relative flex min-w-0 flex-row items-center justify-between gap-4 rounded-xl border p-4 shadow-sm transition hover:shadow-md",
          deleteMenuOpen || menuOpen ? "z-30 overflow-visible" : "overflow-hidden",
          isCompleted
            ? "border-emerald-100/50 bg-emerald-50/10 dark:border-emerald-950/20 dark:bg-emerald-950/5"
            : "border-zinc-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/70",
          dragging === task._id && "opacity-40",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <div className="cursor-grab text-zinc-300 hover:text-zinc-500 dark:text-zinc-700 shrink-0">
            <GripVertical className="size-4" />
          </div>
          {statusIcon}
          <div className="min-w-0 flex-1">
            <input
              defaultValue={task.title}
              onChange={(event) => debouncedTaskTitle(task._id, event.target.value)}
              className={cn(
                "w-full bg-transparent text-sm font-semibold outline-none text-zinc-800 dark:text-zinc-100",
                isCompleted && "text-zinc-400 line-through dark:text-zinc-600",
              )}
              disabled={isCompleted}
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {isCompleted ? (
                <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                  <Check className="size-3 text-emerald-600" />
                  Completed at {formatDateTime(task.completedAt || task.updatedAt, "time", timeZone)}
                </span>
              ) : task.deadlineAt ? (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Deadline: {formatDateTime(task.deadlineAt, "full", timeZone)}
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded border border-dashed border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-400 dark:border-zinc-800">
                  <CalendarClock className="size-3" />
                  Add deadline
                </span>
              )}
              {metaBadges}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {task.deadlineAt && !isCompleted && <TaskCountdown deadlineAt={task.deadlineAt} />}
          {!isCompleted && actionButton}
          {isCompleted && (
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-950/30 dark:bg-emerald-950/20 dark:text-emerald-400">
              <Check className="size-3.5 text-emerald-600" /> Completed
            </div>
          )}
          {!isCompleted ? (
            <div className="flex items-center gap-1">
              <TaskActionIcon
                icon={Repeat}
                tooltip="Recurrence"
                active={task.untilComplete || task.isRecurring}
                activeColor="violet"
                onClick={() => onConfigureRecurring(task)}
              />
              <DeadlinePickerBox
                value={task.deadlineAt ? formatToLocalInputValue(task.deadlineAt, timeZone) : ""}
                onChange={(value) => onUpdate(task._id, { deadlineAt: parseLocalInputValueToUTC(value, timeZone) })}
                timeZone={timeZone}
                customTrigger={
                  <TaskActionIcon
                    icon={Calendar}
                    tooltip="Deadline"
                    active={!!task.deadlineAt}
                    activeColor="violet"
                  />
                }
              />
              <TaskActionIcon
                icon={Star}
                tooltip="Highlight"
                active={highlightTaskIds.includes(task._id)}
                activeColor="amber"
                onClick={() => onUpdate(task._id, { highlight: !highlightTaskIds.includes(task._id) })}
              />
              <TaskActionIcon
                icon={Pencil}
                tooltip="Edit"
                activeColor="violet"
                onClick={() => onEdit(task)}
              />
              <DropdownMenu.Root open={deleteMenuOpen} onOpenChange={setDeleteMenuOpen}>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    title="Delete"
                    aria-label="Delete"
                    className={cn(
                      "grid size-8 place-items-center rounded-full transition outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1",
                      deleteMenuOpen
                        ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                        : "bg-transparent text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400",
                    )}
                  >
                    <Trash2 className="size-4 stroke-[1.75]" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    side="bottom"
                    sideOffset={6}
                    collisionPadding={12}
                    className="z-50 w-52 space-y-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
                    onCloseAutoFocus={(event) => event.preventDefault()}
                  >
                    <p className="text-xs font-semibold">Delete this task?</p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteMenuOpen(false)}
                        className="rounded-md px-2.5 py-1.5 text-[11px] text-zinc-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteMenuOpen(false);
                          onDelete(task._id);
                        }}
                        className="rounded-md bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              <Link
                href={`/sprints/${task.sprintId}/tasks/${task._id}`}
                title="Plan"
                onMouseEnter={() => prefetchTaskPlan(task._id)}
                onFocus={() => prefetchTaskPlan(task._id)}
                className={cn(
                  "ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition",
                  hasPlan
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
                    : "border-emerald-100/80 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40",
                )}
              >
                <List className="size-3.5 stroke-[2]" />
                Plan
              </Link>
              {moreMenu}
            </div>
          ) : (
            moreMenu
          )}
        </div>
      </motion.div>
      )}

      {/* History Modal */}
      <Dialog.Root open={historyOpen} onOpenChange={setHistoryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm dark:bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-20 z-50 w-[min(92vw,480px)] -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <Dialog.Title className="text-base font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <History className="size-4.5 text-zinc-500" />
              Session History
            </Dialog.Title>
            <Dialog.Description className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Previous work sessions completed for <strong className="text-zinc-600 dark:text-zinc-300 font-medium">&quot;{task.title}&quot;</strong>.
            </Dialog.Description>
            
            <div className="mt-4 max-h-[280px] overflow-y-auto space-y-2.5 pr-1">
              {task.history && task.history.length > 0 ? (
                task.history.map((session, index) => (
                  <div key={index} className="border border-zinc-100 dark:border-zinc-900 rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[9px]">
                        Session #{index + 1}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30">
                        Success
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400 mb-2">
                      <div>
                        <span className="font-medium block text-zinc-400 dark:text-zinc-500 mb-0.5">Started At</span>
                        {formatDateTime(session.startedAt, "full", timeZone)}
                      </div>
                      <div>
                        <span className="font-medium block text-zinc-400 dark:text-zinc-500 mb-0.5">Completed At</span>
                        {formatDateTime(session.completedAt, "full", timeZone)}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 flex justify-between items-center text-zinc-800 dark:text-zinc-200 font-medium">
                      <span>Duration</span>
                      <span className="font-mono">{calculateDuration(session.startedAt, session.completedAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                  No previous sessions recorded.
                </div>
              )}
            </div>
            
            <div className="mt-5 flex justify-end">
              <Button variant="subtle" size="sm" onClick={() => setHistoryOpen(false)}>
                Close
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function TaskSection(props: {
  category: CategoryDTO;
  tasks: TaskDTO[];
  draft: string;
  deadlineDraft: DeadlineDraft;
  firstInput?: RefObject<HTMLInputElement | null>;
  dragging: string | null;
  draggingCategory: string | null;
  canReorderCategory: boolean;
  highlightTaskIds: string[];
  pending: boolean;
  activeMenuId: string | null;
  onActiveMenuIdChange: (id: string | null) => void;
  onDraft: (value: string) => void;
  onDeadlineDraft: (value: DeadlineDraft) => void;
  onAdd: () => void;
  onAddTask: () => void;
  onRename: (label: string) => void;
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  onUpdate: (taskId: string, updates: Partial<TaskDTO> & { highlight?: boolean }) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: TaskDTO) => void;
  onDrag: (taskId: string | null) => void;
  onDrop: (category: Category, targetId?: string) => void;
  onCategoryDragStart: (key: string) => void;
  onCategoryDragOver: (key: string) => void;
  onCategoryDragEnd: () => void;
  debouncedTaskTitle: (taskId: string, title: string) => void;
  onConfigureRecurring: (task: TaskDTO) => void;
  timeZone: string;
}) {
  // Resolve theme — prefer stored themeId, fall back to deterministic hash
  const theme = props.category.themeId
    ? getThemeById(props.category.themeId)
    : hashTheme(props.category._id);
  const hasIcon = Boolean(props.category.icon);
  const isCaloriesTracker = Boolean(props.category.isCaloriesTracker);
  const pendingCount = props.tasks.filter((t) => !t.completed).length;
  const nutritionTotals = sumNutrition(props.tasks);
  const isCategoryDragging = props.draggingCategory === props.category.key;

  const [editingName, setEditingName] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <motion.div layout transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}>
    <Card
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl ring-1 transition",
        theme.ring,
        isCategoryDragging && "opacity-45 ring-2 ring-emerald-400/50",
        props.draggingCategory && !isCategoryDragging && "ring-emerald-300/30",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        if (props.draggingCategory) props.onCategoryDragOver(props.category.key);
      }}
      onDrop={() => {
        if (props.draggingCategory) return;
        props.onDrop(props.category.key);
      }}
    >
      {/* ── Themed banner header ────────────────────────────────────── */}
      <div className={cn("bg-gradient-to-br px-3 py-3 sm:px-4 sm:pt-4 sm:pb-3", theme.gradient, theme.darkGradient)}>
        <div
          className="flex min-w-0 cursor-pointer select-none items-start justify-between gap-2 sm:gap-3"
          onClick={(e) => {
            // Only toggle if click is not on an action button / input
            const target = e.target as HTMLElement;
            if (target.closest("button") || target.closest("input")) return;
            setCollapsed((c) => !c);
          }}
          role="button"
          aria-expanded={!collapsed}
          aria-controls={`category-body-${props.category.key}`}
        >
          {/* Left: grip + icon + meta */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {props.canReorderCategory ? (
              <button
                type="button"
                title="Drag to reorder"
                aria-label={`Reorder ${props.category.label}`}
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", props.category.key);
                  props.onCategoryDragStart(props.category.key);
                }}
                onDragEnd={() => props.onCategoryDragEnd()}
                onClick={(event) => event.stopPropagation()}
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 cursor-grab place-items-center rounded-lg transition active:cursor-grabbing",
                  theme.accentText,
                  "opacity-50 hover:bg-white/25 hover:opacity-100 dark:hover:bg-black/20",
                )}
              >
                <GripVertical className="size-4" />
              </button>
            ) : null}
            {/* Circular icon */}
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full border border-white/40 shadow-sm sm:size-11", theme.accentBg)}>
              {hasIcon
                ? <DynamicIcon name={props.category.icon!} className={cn("size-5", theme.accentText)} />
                : <span className="text-lg leading-none">{props.category.emoji === "•" ? "📁" : props.category.emoji}</span>
              }
            </div>
            {/* Title + tagline */}
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {editingName ? (
                  <input
                    autoFocus
                    value={props.category.label}
                    onBlur={() => setEditingName(false)}
                    onChange={(event) => props.onRename(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setEditingName(false);
                    }}
                    className={cn("min-w-0 bg-transparent text-sm font-bold outline-none", theme.accentText)}
                    aria-label="Category name"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h2 className={cn("truncate text-sm font-bold", theme.accentText)}>{props.category.label}</h2>
                )}
                {/* Status badge */}
                <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", theme.badge)}>
                  {isCaloriesTracker
                    ? `${props.tasks.length} meal${props.tasks.length === 1 ? "" : "s"}`
                    : `${pendingCount} pending`}
                </span>
              </div>
              {props.category.tagline && (
                <p className={cn("mt-0.5 hidden truncate text-[11px] italic opacity-75 sm:block", theme.accentText)}>
                  &quot;{props.category.tagline}&quot;
                </p>
              )}
              {isCaloriesTracker && collapsed && (
                <NutritionSummary
                  totals={nutritionTotals}
                  targets={{
                    calories: props.category.targetCalories ?? 0,
                    protein: props.category.targetProtein ?? 0,
                    fat: props.category.targetFat ?? 0,
                    carbs: props.category.targetCarbs ?? 0,
                  }}
                  variant="banner"
                  accentText={theme.accentText}
                />
              )}
            </div>
          </div>

          {/* Right: chevron + actions */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <motion.span
              animate={{ rotate: collapsed ? -90 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="flex items-center"
              aria-hidden
            >
              <ChevronDown className={cn("size-4 transition-colors", theme.accentText, "opacity-60")} />
            </motion.span>
            <OverflowMenu
              menuOpen={props.activeMenuId === props.category.key}
              onMenuOpenChange={(open) => props.onActiveMenuIdChange(open ? props.category.key : null)}
              onEdit={props.onEditCategory}
              onDelete={props.onDeleteCategory}
              deleteConfirmTitle="Delete category?"
              deleteConfirmSubtext="This will delete the category and all its tasks."
            />
          </div>
        </div>
      </div>

      {/* ── Task list + add input (collapsible) ─────────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            id={`category-body-${props.category.key}`}
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }}
            style={{ overflow: "hidden" }}
          >
            <div className="p-3 sm:p-4">
              {isCaloriesTracker && (
                <div className="mb-3">
                  <NutritionSummary totals={nutritionTotals} variant="panel" />
                </div>
              )}
              <div className="min-w-0 space-y-2.5">
                {props.tasks.map((task) =>
                  isCaloriesTracker ? (
                    <MealItem
                      key={task._id}
                      task={task}
                      onEdit={props.onEdit}
                      onDelete={props.onDelete}
                    />
                  ) : (
                    <TaskItem
                      key={task._id}
                      task={task}
                      category={props.category}
                      highlightTaskIds={props.highlightTaskIds}
                      onUpdate={props.onUpdate}
                      onDelete={props.onDelete}
                      onEdit={props.onEdit}
                      onDrag={props.onDrag}
                      onDrop={props.onDrop}
                      debouncedTaskTitle={props.debouncedTaskTitle}
                      dragging={props.dragging}
                      onConfigureRecurring={props.onConfigureRecurring}
                      timeZone={props.timeZone}
                    />
                  ),
                )}
              </div>
              <motion.button
                type="button"
                onClick={props.onAddTask}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className={cn(
                  "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 sm:py-3",
                  isCaloriesTracker
                    ? "border-orange-200 text-orange-600 hover:border-orange-400 hover:bg-orange-50/50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:border-orange-700 dark:hover:bg-orange-950/20"
                    : "border-zinc-300 text-zinc-500 hover:border-violet-400 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-violet-600 dark:hover:text-violet-400",
                )}
              >
                <Plus className="size-4" />
                {isCaloriesTracker ? "Add Meal" : "Add Task"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
    </motion.div>
  );
}




function DeadlinePickerBox({
  value,
  disabled = false,
  onChange,
  className,
  customTrigger,
  timeZone,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
  customTrigger?: React.ReactNode;
  timeZone: string;
}) {
  const [open, setOpen] = useState(false);
  const safeValue = value || `${todayInputValue(timeZone)}T23:59`;
  const selected = parseDateTimeInput(safeValue, timeZone);
  const [viewDate, setViewDate] = useState(() => new Date(selected.year, selected.month, 1));
  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);

  function update(next: Partial<ParsedDateTime>) {
    onChange(toDateTimeInput({ ...selected, ...next }));
  }

  return (
    <div className={cn("relative min-w-0", disabled && "opacity-40", className)}>
      {customTrigger ? (
        <div onClick={() => !disabled && setOpen((current) => !current)}>
          {customTrigger}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-left text-xs text-zinc-700 outline-none transition hover:border-zinc-300 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700"
        >
          <CalendarClock className="size-4 shrink-0 text-zinc-400" />
          <span className="min-w-0 flex-1 truncate">{formatDateTime(safeValue, "short", timeZone)}</span>
        </button>
      )}
      {open && !disabled && typeof document !== "undefined" &&
        createPortal(
          <>
          <button type="button" className="fixed inset-0 z-40 cursor-default bg-transparent" onClick={() => setOpen(false)} aria-label="Close deadline picker" />
          <div className="fixed left-1/2 top-20 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                ‹
              </button>
              <div className="text-sm font-semibold">
                 {formatDateTime(viewDate, "monthYear", timeZone)}
              </div>
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                ›
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_128px]">
              <div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-400">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <span key={`${day}-${index}`} className="py-1">{day}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const isSelected = day.inMonth && day.date.getFullYear() === selected.year && day.date.getMonth() === selected.month && day.date.getDate() === selected.day;
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => update({ year: day.date.getFullYear(), month: day.date.getMonth(), day: day.date.getDate() })}
                        className={cn(
                          "grid h-9 place-items-center rounded-md text-sm transition",
                          day.inMonth ? "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900" : "text-zinc-300 dark:text-zinc-700",
                          isSelected && "bg-zinc-950 text-white hover:bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-50",
                        )}
                      >
                        {day.date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Time</p>
                <div className="grid max-h-60 gap-1 overflow-y-auto rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
                  {TIME_OPTIONS.map((option) => {
                    const isSelected = option.value === selected.time;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => update({ time: option.value })}
                        className={cn(
                          "rounded px-2 py-1.5 text-left text-xs transition hover:bg-zinc-100 dark:hover:bg-zinc-900",
                          isSelected && "bg-zinc-950 text-white hover:bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-50",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => update({ time: "23:59" })}>
                  EOD
                </Button>
                {value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <Button type="button" variant="subtle" size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
          </>,
          document.body,
        )}
    </div>
  );
}


function defaultDeadlineDraft(category: Category, timeZone: string): DeadlineDraft {
  return {
    enabled: category === "URGENT",
    value: `${todayInputValue(timeZone)}T23:59`,
  };
}

function deadlineDraftToIso(draft: DeadlineDraft, timeZone: string) {
  if (!draft.enabled) return null;
  return parseLocalInputValueToUTC(draft.value, timeZone);
}

function parseDateTimeInput(value: string, timeZone: string): ParsedDateTime {
  const fallback = `${todayInputValue(timeZone)}T23:59`;
  const [datePart, timePart = "23:59"] = (value || fallback).split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  return {
    year,
    month: month - 1,
    day,
    time: timePart.slice(0, 5) || "23:59",
  };
}

function toDateTimeInput(value: ParsedDateTime) {
  return `${value.year}-${String(value.month + 1).padStart(2, "0")}-${String(value.day).padStart(2, "0")}T${value.time || "23:59"}`;
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === month,
      key: date.toISOString(),
    };
  });
}

function formatTimeLabel(value: string) {
  const [hourValue, minute] = value.split(":").map(Number);
  const hour = hourValue % 12 || 12;
  const period = hourValue < 12 ? "AM" : "PM";
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function todayInputValue(timeZone: string) {
  return isoDate(undefined, timeZone);
}

function TaskCountdown({ deadlineAt }: { deadlineAt: string }) {
  const [timeLeft, setTimeLeft] = useState<{ hrs: string; mins: string; secs: string } | null>(null);

  useEffect(() => {
    function updateTimer() {
      const target = new Date(deadlineAt).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ hrs: "00", mins: "00", secs: "00" });
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      setTimeLeft({
        hrs: String(hrs).padStart(2, "0"),
        mins: String(mins).padStart(2, "0"),
        secs: String(secs).padStart(2, "0"),
      });
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  if (!timeLeft) return null;

  return (
    <div className="flex w-full shrink-0 flex-col items-center justify-center dark:border-zinc-800 md:w-auto md:border-l md:px-4 lg:px-6">
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 sm:text-[10px]">
        Time Remaining
      </div>
      <div className="mt-1.5 flex items-center font-mono text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200 md:text-xl">
        <div className="flex flex-col items-center">
          <span>{timeLeft.hrs}</span>
          <span className="mt-0.5 font-sans text-[8px] font-medium tracking-normal text-zinc-400 dark:text-zinc-500">HRS</span>
        </div>
        <span className="px-2 pb-4 text-zinc-300">:</span>
        <div className="flex flex-col items-center">
          <span>{timeLeft.mins}</span>
          <span className="mt-0.5 font-sans text-[8px] font-medium tracking-normal text-zinc-400 dark:text-zinc-500">MINS</span>
        </div>
        <span className="px-2 pb-4 text-zinc-300">:</span>
        <div className="flex flex-col items-center">
          <span>{timeLeft.secs}</span>
          <span className="mt-0.5 font-sans text-[8px] font-medium tracking-normal text-zinc-400 dark:text-zinc-500">SECS</span>
        </div>
      </div>
    </div>
  );
}

function calculateDuration(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return "0s";
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diff = e - s;
  if (diff <= 0) return "0s";
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);

  if (hr > 0) {
    return `${hr}h ${min % 60}m`;
  }
  if (min > 0) {
    return `${min}m ${sec % 60}s`;
  }
  return `${sec}s`;
}


