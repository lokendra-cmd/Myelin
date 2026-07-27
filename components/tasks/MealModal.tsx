"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { CircleCheck, CirclePlus, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskDTO, SprintDTO } from "@/types/sprint";

type MealModalProps =
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

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export function MealModal(props: MealModalProps) {
  const isEdit = props.mode === "edit";
  const task = isEdit ? props.task : null;

  const [title, setTitle] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!props.open) return;
    setTitle(task?.title ?? "");
    setCalories(task?.calories != null ? String(task.calories) : "");
    setProtein(task?.protein != null ? String(task.protein) : "");
    setFat(task?.fat != null ? String(task.fat) : "");
    setCarbs(task?.carbs != null ? String(task.carbs) : "");
    setError(null);
    setSubmitting(false);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [props.open, task?.title, task?.calories, task?.protein, task?.fat, task?.carbs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Meal name is required.");
      titleRef.current?.focus();
      return;
    }
    const caloriesNum = parseOptionalNumber(calories);
    if (caloriesNum === null || caloriesNum <= 0) {
      setError("Calories (kcal) is required.");
      return;
    }

    const payload = {
      title: title.trim(),
      calories: caloriesNum,
      protein: parseOptionalNumber(protein),
      fat: parseOptionalNumber(fat),
      carbs: parseOptionalNumber(carbs),
    };

    setError(null);
    setSubmitting(true);
    try {
      if (props.mode === "create") {
        const res = await fetch(`/api/sprints/${props.sprintId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            category: props.category,
            isRecurring: false,
            completed: true,
            completedAt: new Date().toISOString(),
          }),
        });
        if (!res.ok) throw new Error("Failed to log meal.");
        const sprint = await res.json();
        props.onCreated(sprint);
        props.onOpenChange(false);
      } else {
        props.onSaved(props.task._id, payload);
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
                  key="meal-modal-overlay"
                  className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                />
              </Dialog.Overlay>

              <Dialog.Content asChild onOpenAutoFocus={(e) => e.preventDefault()}>
                <motion.div
                  key="meal-modal-content"
                  className="fixed left-1/2 top-1/2 z-50 w-[min(95vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-black/10 dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden"
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.8 }}
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/80 px-5 py-4">
                    <div className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-orange-100 dark:bg-orange-950/40">
                      {isEdit
                        ? <Flame className="size-5 text-orange-600 dark:text-orange-400" />
                        : <CirclePlus className="size-5 text-orange-600 dark:text-orange-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <Dialog.Title className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {isEdit ? "Edit Meal" : "Log Meal"}
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-zinc-500 dark:text-zinc-400">
                        {isEdit ? "Update meal details." : "Track what you ate today."}
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

                  <form onSubmit={handleSubmit} noValidate>
                    <div className="px-5 py-5 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Meal Name
                        </label>
                        <Input
                          ref={titleRef}
                          value={title}
                          onChange={(e) => {
                            if (e.target.value.length <= 100) setTitle(e.target.value);
                          }}
                          placeholder="e.g. Grilled chicken salad"
                          maxLength={100}
                          aria-label="Meal name"
                          className={cn(error && !title.trim() && "border-red-400 focus:ring-red-400")}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Calories <span className="font-normal text-zinc-400">(kcal)</span>
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            placeholder="e.g. 450"
                            aria-label="Calories in kcal"
                            className={cn("pr-12 tabular-nums", error && !calories.trim() && "border-red-400 focus:ring-red-400")}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 pointer-events-none">
                            kcal
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-3">
                          Macros <span className="font-normal text-zinc-400">(optional)</span>
                        </p>
                        <div className="grid grid-cols-3 gap-2.5">
                          {([
                            { key: "protein", label: "Protein", value: protein, set: setProtein },
                            { key: "fat", label: "Fat", value: fat, set: setFat },
                            { key: "carbs", label: "Carbs", value: carbs, set: setCarbs },
                          ] as const).map((field) => (
                            <div key={field.key}>
                              <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                {field.label}
                              </label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step="0.1"
                                  value={field.value}
                                  onChange={(e) => field.set(e.target.value)}
                                  placeholder="0"
                                  className="pr-7 text-sm tabular-nums h-9"
                                  aria-label={`${field.label} in grams`}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 pointer-events-none">
                                  g
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {error && <p className="text-xs text-red-500">{error}</p>}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 px-5 py-4">
                      <Dialog.Close asChild>
                        <Button type="button" variant="ghost" size="sm" disabled={submitting}>
                          Cancel
                        </Button>
                      </Dialog.Close>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submitting || !title.trim() || !calories.trim()}
                        className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 px-4"
                      >
                        {isEdit
                          ? <><CircleCheck className="size-3.5" /> Save Changes</>
                          : <><CirclePlus className="size-3.5" /> Add Meal</>
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
