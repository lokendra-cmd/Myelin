"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Sun, Coffee, Sparkles, X, Repeat } from "lucide-react";
import { RecurringPresetCard } from "./RecurringPresetCard";
import { RecurringWeekdaySelector } from "./RecurringWeekdaySelector";
import { getPresetFromDays, getDaysFromPreset, RecurringPreset } from "@/lib/recurringUtils";
import type { TaskDTO } from "@/types/sprint";

interface RecurringDialogProps {
  task: TaskDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (days: number[]) => void;
}

export function RecurringDialog({
  task,
  open,
  onOpenChange,
  onSave,
}: RecurringDialogProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [preset, setPreset] = useState<RecurringPreset>("custom");

  // Load task's existing recurring configuration on open
  useEffect(() => {
    if (open && task) {
      const days = task.recurringDays || [];
      setSelectedDays(days);
      setPreset(getPresetFromDays(days));
    } else {
      setSelectedDays([]);
      setPreset("custom");
    }
  }, [open, task]);

  function handlePresetChange(nextPreset: RecurringPreset) {
    if (nextPreset === preset) {
      // Toggle off if clicking active preset
      setPreset("custom");
      setSelectedDays([]);
    } else {
      setPreset(nextPreset);
      setSelectedDays(getDaysFromPreset(nextPreset));
    }
  }

  function handleDaysChange(nextDays: number[]) {
    setSelectedDays(nextDays);
    setPreset(getPresetFromDays(nextDays));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Modal Backdrop / Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[3px]"
              />
            </Dialog.Overlay>

            {/* Centered Modal Content Wrapper */}
            <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className="relative w-full max-w-[620px] rounded-3xl border border-zinc-200 bg-white p-7 shadow-2xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Purple Sync Icon Circle Container */}
                      <div className="grid size-12 shrink-0 place-items-center rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                        <Repeat className="size-5.5 stroke-[2.5]" />
                      </div>
                      
                      {/* Labels */}
                      <div className="flex flex-col">
                        <Dialog.Title className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                          Make task recursive
                        </Dialog.Title>
                        <Dialog.Description className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Choose how often this task should repeat.
                        </Dialog.Description>
                      </div>
                    </div>

                    {/* Close Button X */}
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="grid size-8 place-items-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-450 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
                        aria-label="Close modal"
                      >
                        <X className="size-4 stroke-[2.5]" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Body Content */}
                  <div className="mt-8 space-y-6">
                    {/* Presets Title */}
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3.5">
                        Repeat on
                      </h4>
                      {/* Presets Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <RecurringPresetCard
                          title="All day"
                          subtitle="Every day"
                          icon={Calendar}
                          active={preset === "every-day"}
                          onClick={() => handlePresetChange("every-day")}
                          colorTheme="violet"
                        />
                        <RecurringPresetCard
                          title="Weekdays"
                          subtitle="Mon – Fri"
                          icon={Sun}
                          active={preset === "weekdays"}
                          onClick={() => handlePresetChange("weekdays")}
                          colorTheme="amber"
                        />
                        <RecurringPresetCard
                          title="Weekends"
                          subtitle="Sat – Sun"
                          icon={Coffee}
                          active={preset === "weekends"}
                          onClick={() => handlePresetChange("weekends")}
                          colorTheme="blue"
                        />
                      </div>
                    </div>

                    {/* Custom Weekday Selection Grid */}
                    <div className="pt-1">
                      <RecurringWeekdaySelector
                        selectedDays={selectedDays}
                        onChange={handleDaysChange}
                      />
                    </div>

                    {/* Promo Consistency Banner */}
                    <div className="flex items-start gap-4 p-4 rounded-2xl border border-violet-100/60 bg-violet-50/20 dark:border-violet-900/20 dark:bg-violet-950/10">
                      <div className="grid size-10 place-items-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
                        <Sparkles className="size-4.5 stroke-[2]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          Stay consistent, build momentum.
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Recurring tasks help you make progress on autopilot.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions / Footer Buttons Row */}
                  <div className="mt-8 flex justify-end gap-3">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="px-5 py-2.5 rounded-xl border border-zinc-250 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      type="button"
                      onClick={() => onSave(selectedDays)}
                      className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                    >
                      Save
                    </button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
