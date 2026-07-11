"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, CirclePlus, CircleCheck, X, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskDTO, SprintDTO } from "@/types/sprint";

// ─── Deadline utilities (inline, mirrored from sprint-workspace) ─────────────

function todayInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function toDateTimeInput(year: number, month: number, day: number, time: string) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${time}`;
}

function dateTimeInputToIso(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function dateTimeInputValue(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatTimeLabel(value: string) {
  const [hourValue, minute] = value.split(":").map(Number);
  const hour = hourValue % 12 || 12;
  const period = hourValue < 12 ? "AM" : "PM";
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatDateDisplay(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso.replace("T", " ")));
}

function formatTimeDisplay(time: string) {
  return formatTimeLabel(time);
}

const TIME_OPTIONS = [
  ...Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? "00" : "30";
    const value = `${String(hour).padStart(2, "0")}:${minute}`;
    return { value, label: formatTimeLabel(value) };
  }),
  { value: "23:59", label: "11:59 PM" },
];

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, inMonth: date.getMonth() === month, key: date.toISOString() };
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────


type TaskModalProps =
  | {
      mode: "create";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      category: string;
      sprintId: string;
      onCreated: (sprint: SprintDTO) => void;
    }
  | {
      mode: "edit";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      task: TaskDTO;
      onSaved: (taskId: string, updates: Partial<TaskDTO>) => void;
    };

// ─── Inline mini calendar + time picker ──────────────────────────────────────

function DeadlinePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const safeValue = value || `${todayInputValue()}T23:59`;
  const [datePart, timePart = "23:59"] = safeValue.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const selected = { year, month: month - 1, day, time: timePart.slice(0, 5) };
  const [viewDate, setViewDate] = useState(() => new Date(selected.year, selected.month, 1));
  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);

  function update(partial: { year?: number; month?: number; day?: number; time?: string }) {
    const next = { ...selected, ...partial };
    onChange(toDateTimeInput(next.year, next.month, next.day, next.time ?? "23:59"));
  }

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
        <button
          type="button"
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
          className="size-7 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-base font-medium"
        >
          ‹
        </button>
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(viewDate)}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
          className="size-7 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-base font-medium"
        >
          ›
        </button>
      </div>

      <div className="p-3 grid gap-3 sm:grid-cols-[1fr_120px]">
        {/* Calendar grid */}
        <div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-zinc-400 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((calDay) => {
              const isSelected =
                calDay.inMonth &&
                calDay.date.getFullYear() === selected.year &&
                calDay.date.getMonth() === selected.month &&
                calDay.date.getDate() === selected.day;
              return (
                <button
                  key={calDay.key}
                  type="button"
                  onClick={() =>
                    update({
                      year: calDay.date.getFullYear(),
                      month: calDay.date.getMonth(),
                      day: calDay.date.getDate(),
                    })
                  }
                  className={cn(
                    "h-8 rounded-lg text-xs transition",
                    calDay.inMonth
                      ? "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      : "text-zinc-300 dark:text-zinc-700 pointer-events-none",
                    isSelected &&
                      "bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700 font-semibold"
                  )}
                >
                  {calDay.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time list */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Time</p>
          <div className="h-[168px] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 p-1 space-y-0.5">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ time: opt.value })}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-xs transition",
                  opt.value === selected.time
                    ? "bg-violet-600 text-white font-semibold"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/40">
        <CalendarClock className="size-3.5 shrink-0 text-violet-500" />
        <span>
          {formatDateDisplay(safeValue)} · {formatTimeDisplay(selected.time)}
        </span>
      </div>
    </div>
  );
}

// ─── TaskModal ───────────────────────────────────────────────────────────────

export function TaskModal(props: TaskModalProps) {
  const isEdit = props.mode === "edit";
  const task = isEdit ? props.task : null;

  const [title, setTitle] = useState("");
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [isEOD, setIsEOD] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState(`${todayInputValue()}T23:59`);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  // Populate form when modal opens
  useEffect(() => {
    if (!props.open) return;

    if (task) {
      setTitle(task.title);
      if (task.deadlineAt) {
        setDeadlineEnabled(true);
        const inputVal = dateTimeInputValue(task.deadlineAt);
        setDeadlineValue(inputVal);
        // Detect EOD: time portion is 23:59
        setIsEOD(inputVal.endsWith("T23:59"));
      } else {
        setDeadlineEnabled(false);
        setIsEOD(false);
        setDeadlineValue(`${todayInputValue()}T23:59`);
      }
    } else {
      setTitle("");
      setDeadlineEnabled(false);
      setIsEOD(false);
      setDeadlineValue(`${todayInputValue()}T23:59`);
    }
    setError(null);
    setSubmitting(false);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [props.open, task]);

  // When EOD is toggled on, snap deadline to today 23:59
  function handleEODChange(checked: boolean) {
    setIsEOD(checked);
    if (checked) {
      setDeadlineValue(`${todayInputValue()}T23:59`);
    }
  }

  // Resolve final deadline ISO string
  function resolveDeadlineIso(): string | null {
    if (!deadlineEnabled) return null;
    return dateTimeInputToIso(deadlineValue);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task name is required.");
      titleRef.current?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const deadlineAt = resolveDeadlineIso();

      if (props.mode === "create") {
        const res = await fetch(`/api/sprints/${props.sprintId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            category: props.category,
            isRecurring: false,
            deadlineAt,
          }),
        });
        if (!res.ok) throw new Error("Failed to create task.");
        const sprint = await res.json();
        props.onCreated(sprint);
        props.onOpenChange(false);
      } else {
        // Edit mode — call onSaved with partial updates
        const updates: Partial<TaskDTO> = {
          title: title.trim(),
          deadlineAt: resolveDeadlineIso(),
        };
        props.onSaved(props.task._id, updates);
        props.onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <AnimatePresence>
          {props.open && (
            <>
              {/* Overlay */}
              <Dialog.Overlay asChild>
                <motion.div
                  key="task-modal-overlay"
                  className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                />
              </Dialog.Overlay>

              {/* Content */}
              <Dialog.Content asChild onOpenAutoFocus={(e) => e.preventDefault()}>
                <motion.div
                  key="task-modal-content"
                  className="fixed left-1/2 top-1/2 z-50 w-[min(95vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-black/10 dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden"
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.8 }}
                  role="dialog"
                  aria-modal="true"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/80 px-5 py-4">
                    <div className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-violet-100 dark:bg-violet-950/40">
                      {isEdit
                        ? <CheckSquare className="size-5 text-violet-600 dark:text-violet-400" />
                        : <CirclePlus className="size-5 text-violet-600 dark:text-violet-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <Dialog.Title className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {isEdit ? "Edit Task" : "Create New Task"}
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-zinc-500 dark:text-zinc-400">
                        {isEdit ? "Update task details." : "Add a task to this category."}
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        className="shrink-0 size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition"
                        aria-label="Close"
                      >
                        <X className="size-4" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="px-5 py-5 space-y-5">
                      {/* Task Name */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Task Name
                        </label>
                        <div className="relative">
                          <Input
                            ref={titleRef}
                            value={title}
                            onChange={(e) => {
                              if (e.target.value.length <= 100) setTitle(e.target.value);
                            }}
                            placeholder="e.g. Workout"
                            maxLength={100}
                            aria-label="Task name"
                            className={cn(
                              "pr-14",
                              error && !title.trim() && "border-red-400 focus:ring-red-400"
                            )}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 pointer-events-none tabular-nums">
                            {title.length}/100
                          </span>
                        </div>
                        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                      </div>

                      {/* Deadline section */}
                      <div>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Deadline</p>

                        {/* EOD Checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative mt-0.5">
                            <input
                              type="checkbox"
                              checked={isEOD && deadlineEnabled}
                              onChange={(e) => {
                                if (!deadlineEnabled) setDeadlineEnabled(true);
                                handleEODChange(e.target.checked);
                              }}
                              className="sr-only peer"
                              id="eod-checkbox"
                            />
                            <div
                              className={cn(
                                "size-4 rounded border-2 flex items-center justify-center transition-colors",
                                isEOD && deadlineEnabled
                                  ? "bg-violet-600 border-violet-600"
                                  : "border-zinc-300 dark:border-zinc-700 group-hover:border-violet-400"
                              )}
                              onClick={() => {
                                if (!deadlineEnabled) setDeadlineEnabled(true);
                                handleEODChange(!(isEOD && deadlineEnabled));
                              }}
                              role="checkbox"
                              aria-checked={isEOD && deadlineEnabled}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === " " || e.key === "Enter") {
                                  e.preventDefault();
                                  if (!deadlineEnabled) setDeadlineEnabled(true);
                                  handleEODChange(!(isEOD && deadlineEnabled));
                                }
                              }}
                            >
                              {isEOD && deadlineEnabled && (
                                <CircleCheck className="size-3 text-white" />
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              End of Day (EOD)
                            </span>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              Automatically sets today&apos;s deadline to 11:59 PM.
                            </p>
                          </div>
                        </label>

                        {/* Custom date/time picker */}
                        {!isEOD && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                Pick date &amp; time
                              </p>
                              {deadlineEnabled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeadlineEnabled(false);
                                    setDeadlineValue(`${todayInputValue()}T23:59`);
                                  }}
                                  className="text-[11px] text-zinc-400 hover:text-red-500 transition"
                                >
                                  Clear
                                </button>
                              )}
                            </div>

                            {!deadlineEnabled ? (
                              <button
                                type="button"
                                onClick={() => setDeadlineEnabled(true)}
                                className="w-full flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-2.5 text-xs text-zinc-400 hover:border-violet-400 hover:text-violet-500 transition"
                              >
                                <CalendarClock className="size-3.5" />
                                Select date and time for this task&apos;s deadline.
                              </button>
                            ) : (
                              <DeadlinePicker
                                value={deadlineValue}
                                onChange={(v) => {
                                  setDeadlineValue(v);
                                  setIsEOD(false);
                                }}
                              />
                            )}

                            {deadlineEnabled && isEOD && (
                              <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                                Deadline automatically set to today&apos;s end of day.
                              </p>
                            )}
                          </div>
                        )}

                        {isEOD && deadlineEnabled && (
                          <p className="mt-2.5 text-xs text-violet-600 dark:text-violet-400">
                            Deadline automatically set to today&apos;s end of day.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 px-5 py-4">
                      <Dialog.Close asChild>
                        <Button type="button" variant="ghost" size="sm" disabled={submitting}>
                          Cancel
                        </Button>
                      </Dialog.Close>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submitting || !title.trim()}
                        className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 px-4"
                      >
                        {isEdit
                          ? <><CircleCheck className="size-3.5" /> Save Changes</>
                          : <><CirclePlus className="size-3.5" /> Create Task</>
                        }
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
  );
}
