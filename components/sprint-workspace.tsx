"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type RefObject } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowDownToLine, Calendar, CalendarClock, Check, ChevronDown, FileDown, FileText, GripVertical, History, MoreVertical, Play, Plus, RotateCcw, ShieldCheck, Sparkles, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { prettyDate } from "@/utils/date";
import { productivityMood } from "@/utils/productivity";

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
}: {
  initialSprint: SprintDTO;
  initialCategories: CategoryDTO[];
  initialRules?: RuleDTO[];
  quickAdd?: boolean;
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const firstInput = useRef<HTMLInputElement | null>(null);
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
    const deadlineAt = deadlineDraftToIso(deadlineDraft[category] ?? defaultDeadlineDraft(category));
    setDraft((current) => ({ ...current, [category]: "" }));
    setDeadlineDraft((current) => ({ ...current, [category]: defaultDeadlineDraft(category) }));
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
    const themeId = "";
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
    const res = await fetch(`/api/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, icon }),
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
    const map = new Map(categories.map((category) => [category.key, category]));
    for (const task of sprint.tasks) {
      if (!map.has(task.category)) map.set(task.category, categoryFallback(task.category));
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [categories, sprint.tasks]);

  const tasksByCategory = useMemo(() => {
    return visibleCategories.reduce<Record<Category, TaskDTO[]>>((acc, category) => {
      acc[category.key] = sprint.tasks.filter((task) => task.category === category.key).sort((a, b) => a.order - b.order);
      return acc;
    }, {} as Record<Category, TaskDTO[]>);
  }, [sprint.tasks, visibleCategories]);

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

  const displayTitle = sprint.title.startsWith("Sprint ")
    ? `Myelination ${new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(new Date(`${sprint.date}T00:00:00`))}`
    : sprint.title;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Confetti active={sprint.productivity === 100 && sprint.totalTasks > 0} />
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-zinc-500">{prettyDate(sprint.date)}</p>
          <input
            value={displayTitle}
            onChange={(event) => {
              setSprint({ ...sprint, title: event.target.value });
              saveTitle(event.target.value);
            }}
            className="mt-2 w-full bg-transparent text-4xl font-semibold tracking-normal outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="subtle" size="sm"><Link href={`/api/sprints/${sprint._id}/markdown`}><ArrowDownToLine className="size-4" />Markdown</Link></Button>
          <Button asChild variant="subtle" size="sm"><Link href={`/api/sprints/${sprint._id}/pdf`}><FileDown className="size-4" />PDF</Link></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          {/* Daily Rules section — Matches attached design layout & aesthetics */}
          <Card className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Daily Rules</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Principles that guide me every day.</p>
                </div>
              </div>
              <button
                onClick={() => setRuleModalOpen(true)}
                className="h-9 px-4 rounded-lg border border-zinc-200 hover:border-violet-300 dark:border-zinc-800 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-white dark:bg-zinc-900 shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="size-3.5" />
                Add New Rule
              </button>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-5">
              {rules.map((rule) => {
                // Resolve deterministic theme for this rule based on its ID
                const theme = hashTheme(rule.id);
                // Deriving local line color matching the themes system
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
                    default: return "bg-violet-500";
                  }
                };

                return (
                  <div
                    key={rule.id}
                    className="min-h-[108px] h-full relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 flex items-center gap-3.5 group"
                  >
                    {/* Squircle Icon Container */}
                    <div className={cn("size-12 rounded-[20px] flex items-center justify-center shrink-0 border border-white/50 dark:border-zinc-800", theme.accentBg)}>
                      <DynamicIcon name={rule.icon} className={cn("size-5", theme.accentText)} fallback={ShieldCheck} />
                    </div>

                    {/* Rule text clamped to max 3 lines */}
                    <span className="text-[13px] font-medium leading-relaxed text-zinc-800 dark:text-zinc-200 flex-1 min-w-0 pr-4 line-clamp-3 break-words">
                      {rule.text}
                    </span>

                    {/* Reusable Three-dot Menu */}
                    <OverflowMenu
                      menuOpen={activeMenuId === rule.id}
                      onMenuOpenChange={(open) => setActiveMenuId(open ? rule.id : null)}
                      onEdit={() => setEditingRule(rule)}
                      onDelete={() => deleteRule(rule.id)}
                      deleteConfirmTitle="Delete this rule?"
                      deleteConfirmSubtext="This action cannot be undone."
                      className="absolute top-2 right-2"
                    />

                    {/* Bottom horizontal accent line */}
                    <div className={cn("absolute bottom-0 left-4 h-[3.5px] w-14 rounded-t-full", getLineColor(theme.id))} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* My Categories Header Section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 mt-4">
            <div className="space-y-1">
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
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300 self-start sm:self-auto"
              aria-label="Create new category"
            >
              <Sparkles className="size-3.5 text-violet-500" />
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
                  }
                : null
            }
            onSubmit={async (values) => {
              if (editingCategory) {
                const body = {
                  label: values.label,
                  tagline: values.tagline || "",
                  icon: values.icon,
                  themeId: editingCategory.themeId || hashTheme(values.label).id,
                };
                const res = await fetch(`/api/categories/${encodeURIComponent(editingCategory.key)}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error("Failed to update category");
                const updated = await res.json();
                
                // Immediately update categories state
                setCategories((current) =>
                  current.map((cat) =>
                    cat.key === editingCategory.key
                      ? {
                          ...cat,
                          label: updated.label,
                          tagline: updated.tagline,
                          icon: updated.icon,
                          themeId: updated.themeId,
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
            onSave={async (recurringDays) => {
              if (recurringTask) {
                const isRecurring = recurringDays.length > 0;
                await updateTask(recurringTask._id, { isRecurring, recurringDays });
                setRecurringTask(null);
              }
            }}
          />

          <div className="space-y-6">
            {visibleCategories.map((category, index) => (
              <TaskSection
                key={category.key}
                category={category}
                tasks={tasksByCategory[category.key] ?? []}
                firstInput={index === 0 ? firstInput : undefined}
                draft={draft[category.key] ?? ""}
                deadlineDraft={deadlineDraft[category.key] ?? defaultDeadlineDraft(category.key)}
                dragging={dragging}
                onDraft={(value) => setDraft((current) => ({ ...current, [category.key]: value }))}
                onDeadlineDraft={(value) => setDeadlineDraft((current) => ({ ...current, [category.key]: value }))}
                onAdd={() => add(category.key)}
                onRename={(label) => renameCategory(category.key, label)}
                onEditCategory={() => setEditingCategory(category)}
                onDeleteCategory={() => deleteCategory(category.key)}
                onUpdate={updateTask}
                onDelete={remove}
                onDrag={setDragging}
                onDrop={onDrop}
                highlightTaskIds={sprint.highlightTaskIds}
                pending={isPending}
                activeMenuId={activeMenuId}
                onActiveMenuIdChange={setActiveMenuId}
                debouncedTaskTitle={debouncedTaskTitle}
                onConfigureRecurring={setRecurringTask}
              />
            ))}
          </div>
        </section>


        <aside className="space-y-6">
          <Card className="p-6">
            <div className="grid place-items-center"><ProgressRing value={sprint.productivity} /></div>
            <div className="mt-4 text-center text-sm text-zinc-500">{mood.emoji} {mood.label}</div>
            <div className="mt-4 rounded-md bg-zinc-100 p-3 text-center text-sm dark:bg-zinc-900">Completed <span className="font-semibold text-zinc-950 dark:text-zinc-50">{sprint.completedTasks} / {sprint.totalTasks}</span></div>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-zinc-500">Highlight Tasks</p>
            <div className="mt-4 rounded-md bg-zinc-100 p-4 dark:bg-zinc-900">
              {highlightTasks.length ? (
                <>
                  <p className="text-lg font-semibold">
                    {highlightTasks.filter((task) => task.completed).length === highlightTasks.length ? "🎉 All highlights completed" : "Active highlights"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">{highlightTasks.map((task) => task.title).join(" · ")}</p>
                </>
              ) : (
                <p className="text-sm text-zinc-500">Choose one or more tasks to keep in focus.</p>
              )}
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-zinc-500">End of Day</p>
            <div className="mt-4 space-y-3">
              {[
                ["wentWell", "What went well?"],
                ["distracted", "What distracted you?"],
                ["improve", "What can improve tomorrow?"],
              ].map(([key, label]) => (
                <Textarea
                  key={key}
                  placeholder={label}
                  value={sprint.reflection[key as keyof SprintDTO["reflection"]]}
                  onChange={(event) => {
                    const reflection = { ...sprint.reflection, [key]: event.target.value };
                    setSprint({ ...sprint, reflection });
                    saveReflection(reflection);
                  }}
                />
              ))}
            </div>
          </Card>
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
  onDrag,
  onDrop,
  debouncedTaskTitle,
  dragging,
  onConfigureRecurring,
}: {
  task: TaskDTO;
  category: CategoryDTO;
  highlightTaskIds: string[];
  onUpdate: (taskId: string, updates: Partial<TaskDTO> & { highlight?: boolean }) => void;
  onDelete: (taskId: string) => void;
  onDrag: (taskId: string | null) => void;
  onDrop: (category: Category, targetId?: string) => void;
  debouncedTaskTitle: (taskId: string, title: string) => void;
  dragging: string | null;
  onConfigureRecurring: (task: TaskDTO) => void;
}) {
  const isCompleted = task.completed;
  const isInProgress = !task.completed && !!task.startedAt;
  const isBeforeStarting = !task.completed && !task.startedAt;

  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"none" | "start-again" | "delete">("none");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setConfirmMode("none");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        className="border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-800 font-semibold px-3 py-1.5 h-auto text-xs shrink-0 dark:bg-zinc-950 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40 shadow-sm"
      >
        <Check className="size-3.5" /> Mark Completed
      </Button>
    );
  } else if (isBeforeStarting) {
    actionButton = (
      <Button
        variant="default"
        size="sm"
        onClick={() => onUpdate(task._id, { startedAt: new Date().toISOString() })}
        className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-3 py-1.5 h-auto text-xs shrink-0 flex items-center gap-1.5 shadow-sm"
      >
        <Play className="size-3 fill-current" /> Start Task
      </Button>
    );
  }

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

  return (
    <>
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
          "group relative border p-4 rounded-xl shadow-sm transition hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4",
          isCompleted 
            ? "bg-emerald-50/10 border-emerald-100/50 dark:bg-emerald-950/5 dark:border-emerald-950/20"
            : "bg-white/80 dark:bg-zinc-950/70 border-zinc-200/80 dark:border-zinc-800",
          dragging === task._id && "opacity-40"
        )}
      >
        {/* Completed Check badge (Linear style for mobile) */}
        {isCompleted && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-semibold dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30 md:hidden">
            <Check className="size-3" /> Completed
          </div>
        )}

        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="cursor-grab text-zinc-300 hover:text-zinc-500 dark:text-zinc-700 dark:hover:text-zinc-500 shrink-0">
            <GripVertical className="size-4" />
          </div>
          {statusIcon}
          <div className="min-w-0 flex-1">
            <input
              defaultValue={task.title}
              onChange={(event) => debouncedTaskTitle(task._id, event.target.value)}
              className={cn(
                "w-full bg-transparent text-sm font-semibold outline-none text-zinc-800 dark:text-zinc-100",
                isCompleted && "text-zinc-400 line-through dark:text-zinc-600"
              )}
              disabled={isCompleted}
            />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              {isCompleted ? (
                <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  <Check className="size-3 text-emerald-600 dark:text-emerald-500" />
                  Completed at {new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(task.completedAt || task.updatedAt))}
                </span>
              ) : task.deadlineAt ? (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Deadline: {formatFullDateTime(task.deadlineAt)}
                </span>
              ) : (
                <button
                  title="Add deadline"
                  onClick={() => onUpdate(task._id, { deadlineAt: deadlineDraftToIso({ ...defaultDeadlineDraft(category.key), enabled: true }) })}
                  className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border border-dashed border-zinc-200 dark:border-zinc-800 rounded px-2 py-0.5"
                >
                  <CalendarClock className="size-3" />
                  Add deadline
                </button>
              )}
            </div>
            {isInProgress && (
              <div className="flex items-center gap-1 mt-1.5 bg-emerald-50/50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30">
                <span className="size-1 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                In Progress
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100 dark:border-zinc-900">
          {task.deadlineAt && !isCompleted && (
            <TaskCountdown deadlineAt={task.deadlineAt} />
          )}

          <div className="flex items-center gap-2">
            {/* Action Buttons for active tasks */}
            {!isCompleted && actionButton}

            {/* Completed Badge (Desktop) */}
            {isCompleted && (
              <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/30 select-none">
                <Check className="size-3.5 text-emerald-600" /> Completed
              </div>
            )}
            
            {/* Control / Dropdown Row */}
            <div className="flex items-center gap-0.5 text-zinc-400 dark:text-zinc-600 relative">
              {!isCompleted ? (
                <>
                  {task.deadlineAt && (
                    <button
                      title="Clear deadline"
                      onClick={() => onUpdate(task._id, { deadlineAt: null })}
                      className="p-1 hover:text-red-500 transition"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                  <button
                    title="Recurring"
                    onClick={() => onConfigureRecurring(task)}
                    className={cn("p-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition", task.isRecurring && "text-zinc-950 dark:text-zinc-50")}
                  >
                    ↻
                  </button>
                  <button
                    title="Highlight"
                    onClick={() => onUpdate(task._id, { highlight: !highlightTaskIds.includes(task._id) })}
                    className={cn("p-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition", highlightTaskIds.includes(task._id) && "text-amber-500")}
                  >
                    <Star className="size-3.5" />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => onDelete(task._id)}
                    className="p-1 hover:text-red-500 transition"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              ) : (
                <div ref={menuRef} className="relative inline-block text-left">
                  <button
                    title="Actions"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1.5 hover:text-zinc-950 dark:hover:text-zinc-50 transition rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  
                  {menuOpen && (
                    <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-zinc-200 bg-white shadow-xl ring-1 ring-black/5 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 z-20 overflow-hidden transition-all duration-200">
                      {confirmMode === "none" && (
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              setHistoryOpen(true);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 transition"
                          >
                            <History className="size-3.5" />
                            View History
                          </button>
                          <button
                            onClick={() => setConfirmMode("start-again")}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 transition"
                          >
                            <RotateCcw className="size-3.5" />
                            Start Again
                          </button>
                          <button
                            onClick={() => setConfirmMode("delete")}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition"
                          >
                            <Trash2 className="size-3.5" />
                            Delete Task
                          </button>
                        </div>
                      )}

                      {confirmMode === "start-again" && (
                        <div className="p-3 text-left animate-fade-in">
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Start a new session?</p>
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={() => setConfirmMode("none")}
                              className="px-2.5 py-1.5 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleStartAgainConfirmed}
                              className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                            >
                              Start Again
                            </button>
                          </div>
                        </div>
                      )}

                      {confirmMode === "delete" && (
                        <div className="p-3 text-left animate-fade-in">
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Delete this task?</p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">This action cannot be undone.</p>
                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              onClick={() => setConfirmMode("none")}
                              className="px-2.5 py-1.5 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeleteConfirmed}
                              className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

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
                        {formatFullDateTime(session.startedAt)}
                      </div>
                      <div>
                        <span className="font-medium block text-zinc-400 dark:text-zinc-500 mb-0.5">Completed At</span>
                        {formatFullDateTime(session.completedAt)}
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
  highlightTaskIds: string[];
  pending: boolean;
  activeMenuId: string | null;
  onActiveMenuIdChange: (id: string | null) => void;
  onDraft: (value: string) => void;
  onDeadlineDraft: (value: DeadlineDraft) => void;
  onAdd: () => void;
  onRename: (label: string) => void;
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  onUpdate: (taskId: string, updates: Partial<TaskDTO> & { highlight?: boolean }) => void;
  onDelete: (taskId: string) => void;
  onDrag: (taskId: string | null) => void;
  onDrop: (category: Category, targetId?: string) => void;
  debouncedTaskTitle: (taskId: string, title: string) => void;
  onConfigureRecurring: (task: TaskDTO) => void;
}) {
  // Resolve theme — prefer stored themeId, fall back to deterministic hash
  const theme = props.category.themeId
    ? getThemeById(props.category.themeId)
    : hashTheme(props.category._id);
  const hasIcon = Boolean(props.category.icon);
  const pendingCount = props.tasks.filter((t) => !t.completed).length;

  const [editingName, setEditingName] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <Card className={cn("overflow-hidden ring-1", theme.ring)} onDragOver={(event) => event.preventDefault()} onDrop={() => props.onDrop(props.category.key)}>
      {/* ── Themed banner header ────────────────────────────────────── */}
      <div className={cn("bg-gradient-to-br px-4 pt-4 pb-3", theme.gradient, theme.darkGradient)}>
        <div
          className="flex items-start justify-between gap-3 cursor-pointer select-none"
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
          {/* Left: icon + meta */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Circular icon */}
            <div className={cn("size-11 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/40", theme.accentBg)}>
              {hasIcon
                ? <DynamicIcon name={props.category.icon!} className={cn("size-5", theme.accentText)} />
                : <span className="text-lg leading-none">{props.category.emoji === "•" ? "📁" : props.category.emoji}</span>
              }
            </div>
            {/* Title + tagline */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
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
                {/* Pending badge */}
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", theme.badge)}>
                  {pendingCount} pending
                </span>
              </div>
              {props.category.tagline && (
                <p className={cn("mt-0.5 text-[11px] italic truncate opacity-75", theme.accentText)}>
                  &quot;{props.category.tagline}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Right: chevron + actions */}
          <div className="flex items-center gap-1 shrink-0">
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
            <div className="p-4">
              <div className="space-y-2.5">
                {props.tasks.map((task) => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    category={props.category}
                    highlightTaskIds={props.highlightTaskIds}
                    onUpdate={props.onUpdate}
                    onDelete={props.onDelete}
                    onDrag={props.onDrag}
                    onDrop={props.onDrop}
                    debouncedTaskTitle={props.debouncedTaskTitle}
                    dragging={props.dragging}
                    onConfigureRecurring={props.onConfigureRecurring}
                  />
                ))}
              </div>
              <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-2">
                  <Input
                    ref={props.firstInput}
                    value={props.draft}
                    placeholder="+ Add Task"
                    onChange={(event) => props.onDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") props.onAdd();
                    }}
                  />
                  <Button variant="subtle" size="icon" onClick={props.onAdd} disabled={props.pending}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <input
                      type="checkbox"
                      checked={props.deadlineDraft.enabled}
                      onChange={(event) => props.onDeadlineDraft({ ...props.deadlineDraft, enabled: event.target.checked })}
                      className="size-4 rounded border-zinc-300"
                    />
                    Assign deadline
                  </label>
                  <DeadlinePickerBox
                    value={props.deadlineDraft.value}
                    disabled={!props.deadlineDraft.enabled}
                    onChange={(value) => props.onDeadlineDraft({ ...props.deadlineDraft, value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}




function DeadlinePickerBox({
  value,
  disabled = false,
  onChange,
  className,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const safeValue = value || `${todayInputValue()}T23:59`;
  const selected = parseDateTimeInput(safeValue);
  const [viewDate, setViewDate] = useState(() => new Date(selected.year, selected.month, 1));
  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);

  function update(next: Partial<ParsedDateTime>) {
    onChange(toDateTimeInput({ ...selected, ...next }));
  }

  return (
    <div className={cn("relative min-w-0", disabled && "opacity-40", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-left text-xs text-zinc-700 outline-none transition hover:border-zinc-300 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700"
      >
        <CalendarClock className="size-4 shrink-0 text-zinc-400" />
        <span className="min-w-0 flex-1 truncate">{formatDateTimeInput(safeValue)}</span>
      </button>
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
                {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(viewDate)}
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
              <Button type="button" variant="ghost" size="sm" onClick={() => update({ time: "23:59" })}>
                EOD
              </Button>
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


function defaultDeadlineDraft(category: Category): DeadlineDraft {
  return {
    enabled: category === "URGENT",
    value: `${todayInputValue()}T23:59`,
  };
}

function deadlineDraftToIso(draft: DeadlineDraft) {
  if (!draft.enabled) return null;
  return dateTimeInputToIso(draft.value);
}

function dateTimeInputToIso(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}


function parseDateTimeInput(value: string): ParsedDateTime {
  const fallback = `${todayInputValue()}T23:59`;
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

function formatDateTimeInput(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTimeLabel(value: string) {
  const [hourValue, minute] = value.split(":").map(Number);
  const hour = hourValue % 12 || 12;
  const period = hourValue < 12 ? "AM" : "PM";
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function todayInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatFullDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  const day = date.getDate();
  const month = new Intl.DateTimeFormat("en", { month: "long" }).format(date);
  const year = date.getFullYear();
  const time = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
  return `${day} ${month} ${year}, ${time}`;
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
    <div className="flex flex-col items-center justify-center border-l border-zinc-200/80 px-6 dark:border-zinc-800">
      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
        Time Remaining
      </div>
      <div className="mt-1.5 flex items-center font-mono text-xl font-bold tracking-tight text-zinc-700 dark:text-zinc-300">
        <div className="flex flex-col items-center">
          <span>{timeLeft.hrs}</span>
          <span className="text-[8px] font-sans font-medium tracking-normal text-zinc-400 dark:text-zinc-500 mt-0.5">HRS</span>
        </div>
        <span className="text-zinc-400 px-2 pb-4">:</span>
        <div className="flex flex-col items-center">
          <span>{timeLeft.mins}</span>
          <span className="text-[8px] font-sans font-medium tracking-normal text-zinc-400 dark:text-zinc-500 mt-0.5">MINS</span>
        </div>
        <span className="text-zinc-400 px-2 pb-4">:</span>
        <div className="flex flex-col items-center">
          <span>{timeLeft.secs}</span>
          <span className="text-[8px] font-sans font-medium tracking-normal text-zinc-400 dark:text-zinc-500 mt-0.5">SECS</span>
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


