"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type RefObject } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowDownToLine, CalendarClock, Check, FileDown, FolderPlus, GripVertical, Pencil, Plus, ShieldCheck, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Confetti } from "@/components/confetti";
import { ProgressRing } from "@/components/progress-ring";
import { categoryFallback, categoryStyle, SPRINT_RULES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useShortcuts } from "@/hooks/use-shortcuts";
import type { Category, CategoryDTO, SprintDTO, TaskDTO } from "@/types/sprint";
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
  quickAdd,
}: {
  initialSprint: SprintDTO;
  initialCategories: CategoryDTO[];
  quickAdd?: boolean;
}) {
  const [sprint, setSprint] = useState(initialSprint);
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [deadlineDraft, setDeadlineDraft] = useState<Record<string, DeadlineDraft>>({});
  const [categoryDraft, setCategoryDraft] = useState("");
  const [rules, setRules] = useState(SPRINT_RULES);
  const [ruleDraft, setRuleDraft] = useState("");
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

  useEffect(() => {
    const savedRules = localStorage.getItem("sprint:rules");
    if (savedRules) setRules(JSON.parse(savedRules));
  }, []);

  useEffect(() => {
    localStorage.setItem("sprint:rules", JSON.stringify(rules));
  }, [rules]);

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

  async function addCategory() {
    const label = categoryDraft.trim();
    if (!label) return;
    setCategoryDraft("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      const category = await res.json();
      setCategories((current) => [...current, category]);
    }
  }

  function renameCategory(key: string, label: string) {
    setCategories((current) => current.map((category) => (category.key === key ? { ...category, label } : category)));
    saveCategoryName(key, label);
  }

  function addRule() {
    const rule = ruleDraft.trim();
    if (!rule) return;
    setRules((current) => [...current, rule]);
    setRuleDraft("");
  }

  function deleteRule(index: number) {
    setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index));
  }

  function deleteCategory(key: string, label: string) {
    const confirmed = window.confirm(`Delete ${label}? This will also delete every task in this category.`);
    if (!confirmed) return;

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

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Confetti active={sprint.productivity === 100 && sprint.totalTasks > 0} />
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-zinc-500">{prettyDate(sprint.date)}</p>
          <input
            value={sprint.title}
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
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Rules</p>
                  <p className="text-xs text-zinc-500">{rules.length} active guardrails</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-3">
              {rules.map((rule, index) => (
                <div key={`${rule}-${index}`} className="group flex min-h-20 items-start justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="leading-6">{rule}</span>
                  <button title="Delete rule" onClick={() => deleteRule(index)} className="shrink-0 text-zinc-300 opacity-100 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <div className="flex min-h-20 flex-col justify-between rounded-md border border-dashed border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                <Input
                  value={ruleDraft}
                  placeholder="Add rule"
                  onChange={(event) => setRuleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addRule();
                  }}
                />
                <Button className="mt-3 w-full" variant="subtle" size="sm" onClick={addRule}>
                  <Plus className="size-4" />
                  Add Rule
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
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
                onDeleteCategory={() => deleteCategory(category.key, category.label)}
                onUpdate={updateTask}
                onDelete={remove}
                onDrag={setDragging}
                onDrop={onDrop}
                highlightTaskIds={sprint.highlightTaskIds}
                pending={isPending}
                debouncedTaskTitle={debouncedTaskTitle}
              />
            ))}
            <Card className="flex min-h-44 flex-col justify-between border-dashed p-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                  <FolderPlus className="size-4" />
                  Add Category
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Create another lane for the way you actually work.</p>
              </div>
              <div className="mt-5 flex items-center gap-2">
                <Input
                  value={categoryDraft}
                  placeholder="Category name"
                  onChange={(event) => setCategoryDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addCategory();
                  }}
                />
                <Button variant="subtle" size="icon" onClick={addCategory}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </Card>
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

function TaskSection(props: {
  category: CategoryDTO;
  tasks: TaskDTO[];
  draft: string;
  deadlineDraft: DeadlineDraft;
  firstInput?: RefObject<HTMLInputElement | null>;
  dragging: string | null;
  highlightTaskIds: string[];
  pending: boolean;
  onDraft: (value: string) => void;
  onDeadlineDraft: (value: DeadlineDraft) => void;
  onAdd: () => void;
  onRename: (label: string) => void;
  onDeleteCategory: () => void;
  onUpdate: (taskId: string, updates: Partial<TaskDTO> & { highlight?: boolean }) => void;
  onDelete: (taskId: string) => void;
  onDrag: (taskId: string | null) => void;
  onDrop: (category: Category, targetId?: string) => void;
  debouncedTaskTitle: (taskId: string, title: string) => void;
}) {
  const style = categoryStyle(props.category);
  const [editingName, setEditingName] = useState(false);
  const categoryIcon = props.category.emoji === "•" ? "" : props.category.emoji;

  return (
    <Card className={cn("p-4 ring-1", style.ring)} onDragOver={(event) => event.preventDefault()} onDrop={() => props.onDrop(props.category.key)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {categoryIcon && <span className="shrink-0">{categoryIcon}</span>}
          {editingName ? (
            <input
              autoFocus
              value={props.category.label}
              onBlur={() => setEditingName(false)}
              onChange={(event) => props.onRename(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setEditingName(false);
              }}
              className={cn("min-w-0 bg-transparent text-sm font-semibold outline-none", style.tone)}
              aria-label="Category name"
            />
          ) : (
            <h2 className={cn("truncate text-sm font-semibold", style.tone)}>{props.category.label}</h2>
          )}
          <button title="Edit category name" onClick={() => setEditingName(true)} className="text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50">
            <Pencil className="size-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{props.tasks.length}</span>
          <button title="Delete category" onClick={props.onDeleteCategory} className="text-zinc-300 hover:text-red-500">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {props.tasks.map((task) => (
          <motion.div
            key={task._id}
            layout
            draggable
            onDragStart={() => props.onDrag(task._id)}
            onDragEnd={() => props.onDrag(null)}
            onDrop={(event) => {
              event.stopPropagation();
              props.onDrop(props.category.key, task._id);
            }}
            className={cn("group rounded-md border border-transparent bg-zinc-50 p-3 dark:bg-zinc-900", props.dragging === task._id && "opacity-40")}
          >
            <div className="flex min-w-0 items-center gap-2">
              <GripVertical className="size-4 shrink-0 text-zinc-300" />
              <button
                onClick={() => props.onUpdate(task._id, { completed: !task.completed })}
                className={cn("grid size-5 shrink-0 place-items-center rounded border transition", task.completed ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950" : "border-zinc-300 dark:border-zinc-700")}
              >
                {task.completed && <Check className="size-3" />}
              </button>
              <input
                defaultValue={task.title}
                onChange={(event) => props.debouncedTaskTitle(task._id, event.target.value)}
                className={cn("min-w-0 flex-1 bg-transparent text-sm outline-none", task.completed && "text-zinc-400 line-through")}
              />
              <button title="Recurring" onClick={() => props.onUpdate(task._id, { isRecurring: !task.isRecurring })} className={cn("text-xs text-zinc-400", task.isRecurring && "text-zinc-950 dark:text-zinc-50")}>↻</button>
              <button
                title="Highlight"
                onClick={() => props.onUpdate(task._id, { highlight: !props.highlightTaskIds.includes(task._id) })}
                className={cn("text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50", props.highlightTaskIds.includes(task._id) && "text-amber-500")}
              >
                <Star className="size-4" />
              </button>
              <button title="Delete" onClick={() => props.onDelete(task._id)} className="text-zinc-300 hover:text-red-500">
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-3">
              <TaskDeadlineControls task={task} onUpdate={props.onUpdate} />
            </div>
          </motion.div>
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
    </Card>
  );
}

function TaskDeadlineControls({
  task,
  onUpdate,
}: {
  task: TaskDTO;
  onUpdate: (taskId: string, updates: Partial<TaskDTO> & { highlight?: boolean }) => void;
}) {
  if (!task.deadlineAt) {
    return (
      <button
        title="Add deadline"
        onClick={() => onUpdate(task._id, { deadlineAt: deadlineDraftToIso({ ...defaultDeadlineDraft(task.category), enabled: true }) })}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-zinc-200 px-3 text-xs font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
      >
        <CalendarClock className="size-4" />
        Add deadline
      </button>
    );
  }

  const deadlineAt = task.deadlineAt;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center">
      <DeadlineMeter deadlineAt={deadlineAt} completed={task.completed} />
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-1">
        <DeadlinePickerBox
          value={dateTimeInputValue(deadlineAt)}
          onChange={(value) => onUpdate(task._id, { deadlineAt: dateTimeInputToIso(value) })}
        />
        <button title="Clear deadline" onClick={() => onUpdate(task._id, { deadlineAt: null })} className="grid size-8 place-items-center text-zinc-300 hover:text-red-500">
          <X className="size-4" />
        </button>
      </div>
    </div>
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

function DeadlineMeter({ deadlineAt, completed }: { deadlineAt: string; completed: boolean }) {
  const deadline = new Date(deadlineAt);
  const remainingMs = deadline.getTime() - Date.now();
  const overdue = remainingMs < 0 && !completed;
  const hours = Math.max(0, Math.ceil(remainingMs / 3_600_000));
  const progress = completed ? 100 : overdue ? 0 : Math.min(100, Math.max(0, (remainingMs / 86_400_000) * 100));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const label = completed ? "Done" : overdue ? "Late" : hours > 99 ? "99h+" : hours < 1 ? "<1h" : `${hours}h`;

  return (
    <div className="relative grid size-12 shrink-0 place-items-center">
      <svg className="size-12 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-200 dark:text-zinc-800" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (progress / 100) * circumference}
          className={cn(completed ? "text-emerald-500" : overdue ? "text-red-500" : "text-amber-500")}
        />
      </svg>
      <span className={cn("absolute text-[10px] font-semibold leading-none", overdue ? "text-red-500" : "text-zinc-700 dark:text-zinc-200")}>{label}</span>
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

function dateTimeInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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
