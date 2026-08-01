"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  Clock,
  Copy,
  GripVertical,
  List,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IconPicker } from "@/components/entity/IconPicker";
import { DEFAULT_PLAN_COVER, DEFAULT_PLAN_COVER_DARK } from "@/lib/plan-constants";
import { getStepIcon } from "@/lib/step-icons";
import { cn } from "@/lib/utils";
import type {
  TaskPlanPageDTO,
  TaskPlanStepDTO,
} from "@/types/task-plan";
import * as Dialog from "@radix-ui/react-dialog";

function formatMinutes(mins: number | null | undefined) {
  if (mins == null || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatShortDate(iso: string) {
  try {
    // Fixed locale so SSR and client always match (avoids hydration mismatch).
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data as T;
}

export function TaskPlanPage({
  initial,
  sprintId,
}: {
  initial: TaskPlanPageDTO;
  sprintId: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState(initial);
  const [editingMeta, setEditingMeta] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initial.task.title);
  const [descDraft, setDescDraft] = useState(initial.task.description);

  const task = page.task;
  const plan = page.plan;
  const hasCustomCover = Boolean(task.coverImage);
  const estimated =
    formatMinutes(plan.estimatedTimeMinutes ?? task.estimatedTimeMinutes) ??
    formatMinutes(plan.steps.reduce((sum, s) => sum + (s.durationMinutes || 0), 0));

  const completionPercent =
    plan.steps.length > 0
      ? Math.round((plan.steps.filter((s) => s.isCompleted).length / plan.steps.length) * 100)
      : page.completionPercent;

  const setSteps = useCallback((steps: TaskPlanStepDTO[]) => {
    setPage((prev) => ({
      ...prev,
      plan: { ...prev.plan, steps },
      completionPercent:
        steps.length > 0
          ? Math.round((steps.filter((s) => s.isCompleted).length / steps.length) * 100)
          : 0,
      task: {
        ...prev.task,
        planStepCount: steps.length,
        planCompletedStepCount: steps.filter((s) => s.isCompleted).length,
      },
    }));
  }, []);

  async function toggleFavorite() {
    const next = !task.favorite;
    setPage((p) => ({ ...p, task: { ...p.task, favorite: next } }));
    try {
      await jsonFetch(`/api/sprints/${sprintId}/tasks`, {
        method: "PATCH",
        body: JSON.stringify({ taskId: task._id, favorite: next }),
      });
    } catch {
      setPage((p) => ({ ...p, task: { ...p.task, favorite: !next } }));
    }
  }

  async function saveMeta() {
    const title = titleDraft.trim();
    if (!title) return;
    setPage((p) => ({
      ...p,
      task: { ...p.task, title, description: descDraft.trim() },
    }));
    setEditingMeta(false);
    await jsonFetch(`/api/sprints/${sprintId}/tasks`, {
      method: "PATCH",
      body: JSON.stringify({
        taskId: task._id,
        title,
        description: descDraft.trim(),
      }),
    });
  }

  function openEditMeta() {
    setTitleDraft(task.title);
    setDescDraft(task.description);
    setEditingMeta(true);
  }

  function closeEditMeta(open: boolean) {
    setEditingMeta(open);
    if (!open) {
      setTitleDraft(task.title);
      setDescDraft(task.description);
    }
  }

  async function deleteTask() {
    if (!confirm("Delete this task and its plan?")) return;
    await jsonFetch(`/api/sprints/${sprintId}`, {
      method: "DELETE",
      body: JSON.stringify({ taskId: task._id }),
    });
    router.push(`/sprints/${sprintId}`);
  }

  async function markComplete() {
    setPage((p) => ({ ...p, task: { ...p.task, completed: true } }));
    await jsonFetch(`/api/sprints/${sprintId}/tasks`, {
      method: "PATCH",
      body: JSON.stringify({ taskId: task._id, completed: true }),
    });
  }

  async function startTask() {
    const now = new Date().toISOString();
    setPage((p) => ({ ...p, task: { ...p.task, startedAt: now, completed: false } }));
    await jsonFetch(`/api/sprints/${sprintId}/tasks`, {
      method: "PATCH",
      body: JSON.stringify({ taskId: task._id, startedAt: now }),
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-40 pt-4 sm:px-6 md:pb-28 lg:px-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative h-44 sm:h-56 md:h-64">
          {hasCustomCover ? (
            <Image
              src={task.coverImage!}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1152px) 100vw, 1152px"
            />
          ) : (
            <>
              <Image
                src={DEFAULT_PLAN_COVER}
                alt=""
                fill
                priority
                className="object-cover dark:hidden"
                sizes="(max-width: 1152px) 100vw, 1152px"
              />
              <Image
                src={DEFAULT_PLAN_COVER_DARK}
                alt=""
                fill
                priority
                className="hidden object-cover dark:block"
                sizes="(max-width: 1152px) 100vw, 1152px"
              />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/25 dark:from-black/50 dark:via-black/20 dark:to-black/35" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
            <Link
              href={`/sprints/${sprintId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur transition hover:bg-white dark:bg-zinc-950/80 dark:text-zinc-100"
            >
              <ArrowLeft className="size-3.5" />
              Back to Tasks
            </Link>
            <div className="flex items-center gap-1.5">
              <HeaderIconButton
                label={task.favorite ? "Unfavorite" : "Favorite"}
                onClick={toggleFavorite}
                active={task.favorite}
              >
                <Star className={cn("size-4", task.favorite && "fill-amber-400 text-amber-500")} />
              </HeaderIconButton>
              <HeaderIconButton label="Edit" onClick={openEditMeta}>
                <Pencil className="size-4" />
              </HeaderIconButton>
              <HeaderIconButton label="Delete" onClick={deleteTask} danger>
                <Trash2 className="size-4" />
              </HeaderIconButton>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 shadow-sm sm:size-12 dark:bg-emerald-950 dark:text-emerald-300">
                <List className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-3xl">
                  {task.title}
                </h1>
                {task.description ? (
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-[15px]">
                    {task.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge completed={task.completed} started={Boolean(task.startedAt)} />
                  {estimated ? (
                    <MetaPill icon={Clock} className="bg-emerald-50/95 text-emerald-800">
                      {estimated}
                    </MetaPill>
                  ) : null}
                  <MetaPill icon={Tag} className="bg-violet-50/95 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                    {page.categoryLabel || task.category}
                  </MetaPill>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Edit task meta modal */}
      <Dialog.Root open={editingMeta} onOpenChange={closeEditMeta}>
        <Dialog.Portal>
          <AnimatePresence>
            {editingMeta && (
              <>
                <Dialog.Overlay asChild>
                  <motion.div
                    key="edit-meta-overlay"
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  />
                </Dialog.Overlay>

                <Dialog.Content asChild onOpenAutoFocus={(e) => e.preventDefault()}>
                  <motion.div
                    key="edit-meta-content"
                    className="fixed left-1/2 top-1/2 z-50 w-[min(95vw,440px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-black/15 dark:border-zinc-800 dark:bg-zinc-950"
                    initial={{ opacity: 0, scale: 0.94, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.8 }}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/80">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40">
                        <Pencil className="size-4 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Dialog.Title className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          Edit Task
                        </Dialog.Title>
                        <Dialog.Description className="text-xs text-zinc-500 dark:text-zinc-400">
                          Update the title and short description.
                        </Dialog.Description>
                      </div>
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="grid size-7 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                          aria-label="Close"
                        >
                          <X className="size-4" />
                        </button>
                      </Dialog.Close>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveMeta();
                      }}
                      noValidate
                    >
                      <div className="space-y-4 px-5 py-5">
                        <div>
                          <label
                            htmlFor="plan-edit-title"
                            className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                          >
                            Task Name
                          </label>
                          <Input
                            id="plan-edit-title"
                            value={titleDraft}
                            onChange={(e) => {
                              if (e.target.value.length <= 100) setTitleDraft(e.target.value);
                            }}
                            maxLength={100}
                            autoFocus
                            placeholder="e.g. Morning Workout"
                            className="h-11 rounded-xl border-zinc-200 text-[15px] font-medium focus:border-emerald-400 dark:focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="plan-edit-desc"
                            className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                          >
                            Description
                          </label>
                          <Textarea
                            id="plan-edit-desc"
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            rows={3}
                            placeholder="Short description…"
                            className="min-h-[88px] rounded-xl border-zinc-200 focus:border-emerald-400 dark:focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
                        <Dialog.Close asChild>
                          <Button type="button" variant="ghost" size="sm">
                            Cancel
                          </Button>
                        </Dialog.Close>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!titleDraft.trim()}
                          className="gap-1.5 bg-emerald-700 px-4 text-white hover:bg-emerald-800"
                        >
                          <CircleCheck className="size-3.5" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                </Dialog.Content>
              </>
            )}
          </AnimatePresence>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Body */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <PlanStepsPanel
            taskId={task._id}
            steps={plan.steps}
            onStepsChange={setSteps}
          />
        </div>

        <aside className="space-y-4">
          <SidebarCard title="Overview">
            <OverviewRow label="Estimated Time" value={estimated ?? "—"} />
            <OverviewRow label="Category" value={page.categoryLabel || task.category} />
            <OverviewRow label="Created" value={formatShortDate(task.createdAt)} />
            <OverviewRow label="Updated" value={formatShortDate(task.updatedAt)} />
            <OverviewRow label="Completion" value={`${completionPercent}%`} />
            <OverviewRow label="Steps" value={String(plan.steps.length)} />
          </SidebarCard>
        </aside>
      </div>

      {/* Footer CTAs — sit above mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 md:bottom-0 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl gap-3">
          <Button
            variant="subtle"
            className="h-11 flex-1 border border-zinc-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-emerald-400"
            onClick={markComplete}
            disabled={task.completed}
          >
            <Check className="size-4" />
            Mark as Complete
          </Button>
          <Button
            className="h-11 flex-1 bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            onClick={startTask}
            disabled={Boolean(task.startedAt) && !task.completed}
          >
            <Play className="size-4 fill-current" />
            Start Task
          </Button>
        </div>
      </div>
    </div>
  );
}

function HeaderIconButton({
  children,
  label,
  onClick,
  active,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-white/90 text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white dark:bg-zinc-950/80 dark:text-zinc-200",
        active && "ring-2 ring-amber-300/60",
        danger && "hover:text-red-600",
      )}
    >
      {children}
    </button>
  );
}

function MetaPill({
  icon: Icon,
  children,
  className,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize shadow-sm backdrop-blur",
        className,
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  );
}

function StatusBadge({ completed, started }: { completed: boolean; started: boolean }) {
  if (completed) {
    return (
      <MetaPill icon={Check} className="bg-emerald-100/95 text-emerald-800">
        Completed
      </MetaPill>
    );
  }
  if (started) {
    return (
      <MetaPill icon={Play} className="bg-sky-50/95 text-sky-700">
        In Progress
      </MetaPill>
    );
  }
  return (
    <MetaPill icon={CircleDotBadge} className="bg-white/90 text-zinc-600">
      Not Started
    </MetaPill>
  );
}

function CircleDotBadge({ className }: { className?: string }) {
  return <span className={cn("inline-block size-2 rounded-full bg-current", className)} />;
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-950/[0.03] dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      <div className="mt-3 space-y-2.5">{children}</div>
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate font-medium text-zinc-800 dark:text-zinc-100">{value}</span>
    </div>
  );
}

/* ─── Plan Steps ─────────────────────────────────────────────────── */

function PlanStepsPanel({
  taskId,
  steps,
  onStepsChange,
}: {
  taskId: string;
  steps: TaskPlanStepDTO[];
  onStepsChange: (steps: TaskPlanStepDTO[]) => void;
}) {
  const [optimisticSteps, applyOptimistic] = useOptimistic(steps);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState(15);
  const [newIcon, setNewIcon] = useState("Clipboard");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  // Soft virtualization via content-visibility for long lists.
  const useVirtualHint = optimisticSteps.length > 40;

  async function addStep() {
    const title = newTitle.trim();
    if (!title) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: TaskPlanStepDTO = {
      _id: tempId,
      planId: steps[0]?.planId ?? "",
      orderIndex: steps.length,
      title,
      description: newDesc.trim(),
      durationMinutes: newDuration,
      icon: newIcon,
      isCompleted: false,
      isCollapsed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    startTransition(() => {
      applyOptimistic([...steps, optimistic]);
    });
    setAdding(false);
    setNewTitle("");
    setNewDesc("");
    try {
      const created = await jsonFetch<TaskPlanStepDTO>(`/api/tasks/${taskId}/plan/steps`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description: newDesc.trim(),
          durationMinutes: newDuration,
          icon: newIcon,
        }),
      });
      onStepsChange([...steps, created]);
    } catch {
      onStepsChange(steps);
    }
  }

  async function patchStep(stepId: string, patch: Partial<TaskPlanStepDTO>) {
    const next = steps.map((s) => (s._id === stepId ? { ...s, ...patch } : s));
    onStepsChange(next);
    startTransition(() => applyOptimistic(next));
    await jsonFetch(`/api/tasks/${taskId}/plan/steps/${stepId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  async function removeStep(stepId: string) {
    const next = steps.filter((s) => s._id !== stepId).map((s, i) => ({ ...s, orderIndex: i }));
    onStepsChange(next);
    await jsonFetch(`/api/tasks/${taskId}/plan/steps/${stepId}`, { method: "DELETE" });
  }

  async function duplicateStep(stepId: string) {
    const created = await jsonFetch<TaskPlanStepDTO>(`/api/tasks/${taskId}/plan/steps/${stepId}`, {
      method: "POST",
      body: JSON.stringify({ action: "duplicate" }),
    });
    const idx = steps.findIndex((s) => s._id === stepId);
    const next = [...steps];
    next.splice(idx + 1, 0, created);
    onStepsChange(next.map((s, i) => ({ ...s, orderIndex: i })));
  }

  function onDragStart(id: string) {
    setDragId(id);
  }

  function onDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    const from = optimisticSteps.findIndex((s) => s._id === dragId);
    const to = optimisticSteps.findIndex((s) => s._id === overId);
    if (from < 0 || to < 0) return;
    const next = [...optimisticSteps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    startTransition(() => applyOptimistic(next.map((s, i) => ({ ...s, orderIndex: i }))));
  }

  async function onDragEnd() {
    if (!dragId) return;
    setDragId(null);
    const ordered = optimisticSteps.map((s) => s._id);
    onStepsChange(optimisticSteps.map((s, i) => ({ ...s, orderIndex: i })));
    await jsonFetch(`/api/tasks/${taskId}/plan/steps`, {
      method: "PUT",
      body: JSON.stringify({ stepIds: ordered }),
    });
  }

  return (
    <section>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Step-by-step Plan</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Break down the task into clear, actionable steps</p>
      </div>

      <div ref={listRef} className="mt-5 space-y-3">
        <AnimatePresence initial={false}>
          {optimisticSteps.map((step, index) => (
            <motion.div
              key={step._id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              style={useVirtualHint ? { contentVisibility: "auto", containIntrinsicSize: "0 88px" } : undefined}
            >
              <StepCard
                step={step}
                index={index}
                dragging={dragId === step._id}
                onDragStart={() => onDragStart(step._id)}
                onDragOver={(e) => onDragOver(e, step._id)}
                onDragEnd={onDragEnd}
                onToggleComplete={() => patchStep(step._id, { isCompleted: !step.isCompleted })}
                onDuplicate={() => void duplicateStep(step._id)}
                onDelete={() => void removeStep(step._id)}
                onSave={(patch) => void patchStep(step._id, patch)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {adding ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Step title"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void addStep();
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="size-3.5" />
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value) || 0)}
                  className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
                min
              </label>

              <Dialog.Root open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                <Dialog.Trigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    {(() => {
                      const Preview = getStepIcon(newIcon);
                      return (
                        <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <Preview className="size-3.5" />
                        </span>
                      );
                    })()}
                    Icon
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm dark:bg-black/50" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
                    <Dialog.Title className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Choose step icon
                    </Dialog.Title>
                    <Dialog.Description className="mt-0.5 text-xs text-zinc-500">
                      Pick a visual that matches this step.
                    </Dialog.Description>
                    <div className="mt-3">
                      <IconPicker
                        value={newIcon}
                        onChange={(name) => {
                          setNewIcon(name);
                          setIconPickerOpen(false);
                        }}
                        accentBg="bg-emerald-100 dark:bg-emerald-950/40"
                        accentText="text-emerald-700 dark:text-emerald-300"
                      />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button variant="subtle" size="sm" onClick={() => setIconPickerOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>

              <div className="ml-auto flex gap-2">
                <Button variant="subtle" size="sm" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-700 text-white hover:bg-emerald-800"
                  onClick={() => void addStep()}
                  disabled={pending || !newTitle.trim()}
                >
                  Add Step
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 py-5 text-sm font-medium text-zinc-500 transition hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-emerald-800 dark:hover:text-emerald-400"
          >
            <Plus className="size-4" />
            Add Step
          </button>
        )}
      </div>
    </section>
  );
}

function StepCard({
  step,
  index,
  dragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onToggleComplete,
  onDuplicate,
  onDelete,
  onSave,
}: {
  step: TaskPlanStepDTO;
  index: number;
  dragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleComplete: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: (patch: Partial<TaskPlanStepDTO>) => void;
}) {
  const Icon = getStepIcon(step.icon);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasDescription = Boolean(step.description?.trim());

  useEffect(() => {
    setTitle(step.title);
    setDescription(step.description);
  }, [step.title, step.description]);

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div
      draggable={!editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        "group rounded-2xl border border-zinc-200/90 bg-white px-3 py-3 shadow-sm shadow-zinc-950/[0.03] transition dark:border-zinc-800 dark:bg-zinc-950 sm:px-4",
        dragging && "opacity-60 ring-2 ring-emerald-300",
        step.isCompleted && "bg-zinc-50/80 dark:bg-zinc-900/50",
      )}
    >
      {editing ? (
        <div className="space-y-2 py-0.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900"
            autoFocus
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional description"
            className="w-full resize-none rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-700 text-white hover:bg-emerald-800"
              onClick={() => {
                onSave({ title: title.trim() || step.title, description: description.trim() });
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button variant="subtle" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="shrink-0 cursor-grab touch-none text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
            aria-label="Drag to reorder"
            tabIndex={-1}
          >
            <GripVertical className="size-4" />
          </button>

          <button
            type="button"
            onClick={onToggleComplete}
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold transition",
              step.isCompleted
                ? "bg-emerald-700 text-white"
                : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
            )}
            aria-label={step.isCompleted ? "Mark incomplete" : "Mark complete"}
          >
            {step.isCompleted ? <Check className="size-3.5" /> : index + 1}
          </button>

          <div
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full",
              step.isCompleted
                ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
            )}
          >
            <Icon className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "truncate text-[15px] font-semibold leading-6 text-zinc-900 dark:text-zinc-50",
                step.isCompleted && "text-zinc-400 line-through",
              )}
            >
              {step.title}
            </h3>
            {hasDescription ? (
              <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-zinc-500">{step.description}</p>
            ) : null}
          </div>

          {step.durationMinutes > 0 ? (
            <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <Clock className="size-3" />
              {formatMinutes(step.durationMinutes)}
            </span>
          ) : null}

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900"
              aria-label="Step options"
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
                <MenuItem
                  icon={Pencil}
                  label="Edit"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                />
                <MenuItem
                  icon={Copy}
                  label="Duplicate"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate();
                  }}
                />
                <MenuItem
                  icon={Trash2}
                  label="Delete"
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900",
        danger ? "text-red-600" : "text-zinc-700 dark:text-zinc-200",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
