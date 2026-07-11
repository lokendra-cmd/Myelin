"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, CirclePlus, CircleCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskDTO, SprintDTO } from "@/types/sprint";

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

export function TaskModal(props: TaskModalProps) {
  const isEdit = props.mode === "edit";
  const task = isEdit ? props.task : null;

  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!props.open) return;
    setTitle(task?.title ?? "");
    setError(null);
    setSubmitting(false);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [props.open, task?.title]);

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
      if (props.mode === "create") {
        const res = await fetch(`/api/sprints/${props.sprintId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), category: props.category, isRecurring: false }),
        });
        if (!res.ok) throw new Error("Failed to create task.");
        const sprint = await res.json();
        props.onCreated(sprint);
        props.onOpenChange(false);
      } else {
        props.onSaved(props.task._id, { title: title.trim() });
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

              <Dialog.Content asChild onOpenAutoFocus={(e) => e.preventDefault()}>
                <motion.div
                  key="task-modal-content"
                  className="fixed left-1/2 top-1/2 z-50 w-[min(95vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-black/10 dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden"
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
                    <div className="px-5 py-5">
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
                          placeholder="e.g. Morning Workout"
                          maxLength={100}
                          aria-label="Task name"
                          className={cn("pr-14", error && "border-red-400 focus:ring-red-400")}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 pointer-events-none tabular-nums">
                          {title.length}/100
                        </span>
                      </div>
                      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
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
