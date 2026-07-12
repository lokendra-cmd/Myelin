"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { deleteSprintAction } from "@/actions/sprints";
import { prettyDate } from "@/utils/date";
import { productivityMood } from "@/utils/productivity";
import type { SprintDTO } from "@/types/sprint";

interface ReviewListProps {
  initialSprints: SprintDTO[];
  timeZone: string;
}

export function ReviewList({ initialSprints, timeZone }: ReviewListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sprints, setSprints] = useState<SprintDTO[]>(initialSprints);
  const [sprintToDelete, setSprintToDelete] = useState<string | null>(null);

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
      <div className="grid grid-cols-[1.2fr_.7fr_.7fr_.8fr_1.5fr_.4fr_60px] border-b border-zinc-200 px-4 py-3 text-xs font-medium text-zinc-500 dark:border-zinc-800">
        <span>Date</span>
        <span>Completed</span>
        <span>Total</span>
        <span>Productivity</span>
        <span>Reflection Preview</span>
        <span>Mood</span>
        <span className="text-right pr-2">Action</span>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
        {sprints.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No history recorded yet.
          </div>
        ) : (
          sprints.map((sprint) => {
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
                className="grid grid-cols-[1.2fr_.7fr_.7fr_.8fr_1.5fr_.4fr_60px] px-4 py-3 text-sm transition hover:bg-zinc-55/60 dark:hover:bg-zinc-900/50 cursor-pointer items-center group"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {prettyDate(sprint.date, "short", timeZone)}
                </span>
                <span className="text-zinc-650 dark:text-zinc-350">{sprint.completedTasks}</span>
                <span className="text-zinc-650 dark:text-zinc-350">{sprint.totalTasks}</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {sprint.productivity}%
                </span>
                <span className="truncate text-zinc-500 dark:text-zinc-450 pr-4">
                  {reflection}
                </span>
                <span>{mood.emoji}</span>
                <div className="flex justify-end pr-1">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSprintToDelete(sprint._id);
                    }}
                    className="grid size-8 place-items-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
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

      {/* Premium Radix UI Delete Confirmation Dialog */}
      <Dialog.Root open={!!sprintToDelete} onOpenChange={(open) => !open && setSprintToDelete(null)}>
        <AnimatePresence>
          {sprintToDelete && (
            <Dialog.Portal forceMount>
              {/* Backdrop */}
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[3px]"
                />
              </Dialog.Overlay>

              {/* Centered Box */}
              <div className="fixed inset-0 z-50 grid place-items-center p-4">
                <Dialog.Content asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    className="relative w-full max-w-[440px] rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      {/* Warning Triangle Circle */}
                      <div className="grid size-12 shrink-0 place-items-center rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
                        <AlertTriangle className="size-5.5 stroke-[2]" />
                      </div>

                      <div className="flex flex-col min-w-0 pr-4">
                        <Dialog.Title className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                          Delete Day History?
                        </Dialog.Title>
                        <Dialog.Description className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                          This will permanently delete all task data and productivity records for this day. This action cannot be undone.
                        </Dialog.Description>
                      </div>

                      {/* Close button */}
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="absolute top-4 right-4 grid size-7 place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <X className="size-3.5 stroke-[2.5]" />
                        </button>
                      </Dialog.Close>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex justify-end gap-3">
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          disabled={isPending}
                          className="px-4 py-2 rounded-xl border border-zinc-250 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors focus:outline-none"
                        >
                          Cancel
                        </button>
                      </Dialog.Close>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(sprintToDelete)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
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
