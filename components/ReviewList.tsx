"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  AlertTriangle,
  X,
  CalendarDays,
  ChevronRight,
  ListFilter,
  Sparkles,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { deleteSprintAction } from "@/actions/sprints";
import { ProgressRing } from "@/components/progress-ring";
import { prettyDate, isoDate } from "@/utils/date";
import { productivityMood } from "@/utils/productivity";
import type { SprintDTO } from "@/types/sprint";
import { cn } from "@/lib/utils";

interface ReviewListProps {
  initialSprints: SprintDTO[];
  timeZone: string;
}

function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function weekdayLabel(dateStr: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone,
    }).format(new Date(`${dateStr}T12:00:00Z`));
  } catch {
    return "";
  }
}

export function ReviewList({ initialSprints, timeZone }: ReviewListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sprints, setSprints] = useState<SprintDTO[]>(initialSprints);
  const [sprintToDelete, setSprintToDelete] = useState<string | null>(null);
  const [range, setRange] = useState<"week" | "all">("week");

  const today = isoDate(undefined, timeZone);
  const weekStart = startOfWeek(today);

  const filtered = useMemo(() => {
    if (range === "all") return sprints;
    return sprints.filter((sprint) => sprint.date >= weekStart && sprint.date <= today);
  }, [sprints, range, weekStart, today]);

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteSprintAction(id);
        setSprints((current) => current.filter((s) => s._id !== id));
        setSprintToDelete(null);
        router.refresh();
      } catch (err) {
        console.error("Failed to delete sprint", err);
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setRange("week")}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
              range === "week"
                ? "bg-accent-soft text-accent shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
            )}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setRange("all")}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
              range === "all"
                ? "bg-accent-soft text-accent shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
            )}
          >
            All
          </button>
        </div>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
          title="Filter"
          aria-label="Filter"
        >
          <ListFilter className="size-4" />
        </button>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            No history recorded yet.
          </div>
        ) : (
          filtered.map((sprint) => {
            const mood = productivityMood(sprint.productivity);
            return (
              <div
                key={sprint._id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/sprints/${sprint._id}`)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <CalendarDays className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {prettyDate(sprint.date, "short", timeZone)}
                    </p>
                    <p className="text-xs text-zinc-500">{weekdayLabel(sprint.date, timeZone)}</p>
                  </div>
                  <div className="shrink-0 text-center">
                    <p className="text-sm font-semibold tabular-nums">
                      {sprint.completedTasks} <span className="text-zinc-300">/</span> {sprint.totalTasks}
                    </p>
                    <p className="flex justify-center gap-2 text-[9px] text-zinc-400">
                      <span>Completed</span>
                      <span>Total</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <ProgressRing value={sprint.productivity} size={48} showLabel={false} />
                      <span className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] font-semibold">
                        {sprint.productivity}%
                      </span>
                    </div>
                    <span className="text-base">{mood.emoji}</span>
                    <ChevronRight className="size-4 text-zinc-300" />
                  </div>
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setSprintToDelete(sprint._id)}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                  title="Delete Day"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })
        )}

        <div className="flex items-start gap-3 rounded-2xl border border-accent/15 bg-accent-soft/70 p-4 dark:bg-accent-soft/40">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/80 text-accent dark:bg-zinc-950/40">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Keep it up!</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Consistency is the key to building great habits. You&apos;re making steady progress.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
        <div className="grid grid-cols-[1.2fr_.7fr_.7fr_.8fr_1.5fr_.4fr_60px] border-b border-zinc-200 px-4 py-3 text-xs font-medium text-zinc-500 dark:border-zinc-800">
          <span>Date</span>
          <span>Completed</span>
          <span>Total</span>
          <span>Productivity</span>
          <span>Reflection Preview</span>
          <span>Mood</span>
          <span className="pr-2 text-right">Action</span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No history recorded yet.
            </div>
          ) : (
            filtered.map((sprint) => {
              const mood = productivityMood(sprint.productivity);
              const reflection =
                sprint.reflection.wentWell ||
                sprint.reflection.distracted ||
                sprint.reflection.improve ||
                "No reflection";

              return (
                <div
                  key={sprint._id}
                  onClick={() => router.push(`/sprints/${sprint._id}`)}
                  className="group grid cursor-pointer grid-cols-[1.2fr_.7fr_.7fr_.8fr_1.5fr_.4fr_60px] items-center px-4 py-3 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {prettyDate(sprint.date, "short", timeZone)}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">{sprint.completedTasks}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{sprint.totalTasks}</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {sprint.productivity}%
                  </span>
                  <span className="truncate pr-4 text-zinc-500">{reflection}</span>
                  <span>{mood.emoji}</span>
                  <div className="flex justify-end pr-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSprintToDelete(sprint._id);
                      }}
                      className="grid size-8 place-items-center rounded-lg text-zinc-400 transition-all hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-zinc-500 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                      title="Delete Day"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog.Root open={!!sprintToDelete} onOpenChange={(open) => !open && setSprintToDelete(null)}>
        <AnimatePresence>
          {sprintToDelete && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[3px]"
                />
              </Dialog.Overlay>

              <div className="fixed inset-0 z-50 grid place-items-center p-4">
                <Dialog.Content asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    className="relative w-full max-w-[440px] rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400">
                        <AlertTriangle className="size-5 stroke-[2]" />
                      </div>

                      <div className="flex min-w-0 flex-col pr-4">
                        <Dialog.Title className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                          Delete Day History?
                        </Dialog.Title>
                        <Dialog.Description className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                          This will permanently delete all task data and productivity records for this day. This action cannot be undone.
                        </Dialog.Description>
                      </div>

                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="absolute right-4 top-4 grid size-7 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                        >
                          <X className="size-3.5 stroke-[2.5]" />
                        </button>
                      </Dialog.Close>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          disabled={isPending}
                          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          Cancel
                        </button>
                      </Dialog.Close>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(sprintToDelete)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {isPending ? "Deleting..." : "Delete Day"}
                      </button>
                    </div>
                  </motion.div>
                </Dialog.Content>
              </div>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}
