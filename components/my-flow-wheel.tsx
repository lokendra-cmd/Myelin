"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/progress-ring";
import { cn } from "@/lib/utils";
import type { MyFlowResult } from "@/utils/my-flow";

export function MyFlowWheel({
  result,
  size = 112,
  className,
}: {
  result: MyFlowResult;
  size?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const labelSize = size < 100 ? "text-xl" : size < 128 ? "text-2xl" : "text-[1.75rem]";
  const captionSize = size < 100 ? "text-[9px]" : "text-[10px]";

  return (
    <>
      <Card className={cn("rounded-2xl p-4 sm:p-5", className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-4 rounded-xl px-1 py-1 text-left outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-zinc-900/60 lg:flex-col lg:text-center"
          aria-label={`My Flow ${result.score} percent, ${result.label}. View details.`}
        >
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <ProgressRing value={result.score} size={size} showLabel={false} />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div
                  className={cn(
                    "font-semibold uppercase tracking-[0.16em] text-zinc-500",
                    captionSize,
                  )}
                >
                  My Flow
                </div>
                <div className={cn("mt-0.5 font-bold tabular-nums leading-none", labelSize)}>
                  {result.score}%
                </div>
              </div>
            </div>
          </div>
          <div className="min-w-0 lg:mt-1">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 lg:font-medium lg:text-zinc-600 lg:dark:text-zinc-300">
              {result.label}
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500 lg:hidden">Tap to see planned vs actual flow</p>
          </div>
        </button>
      </Card>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open ? (
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
              <div className="fixed inset-0 z-50 grid place-items-end p-4 sm:place-items-center">
                <Dialog.Content asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="relative w-full max-w-[400px] rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 sm:p-6"
                  >
                    <Dialog.Title className="text-base font-bold tracking-tight">My Flow</Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-zinc-500">
                      How closely today followed your planned sequence — not how many tasks you finished.
                    </Dialog.Description>

                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="absolute right-4 top-4 grid size-7 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                        aria-label="Close"
                      >
                        <X className="size-3.5 stroke-[2.5]" />
                      </button>
                    </Dialog.Close>

                    <div className="mt-5 space-y-4">
                      <FlowLine title="Your planned flow" labels={result.plannedCategoryFlow} empty="No categories planned." />
                      <FlowLine
                        title="Your actual flow"
                        labels={result.actualCategoryFlow}
                        empty="You haven't started today's sequence yet."
                      />
                    </div>

                    {result.explanations.length > 0 ? (
                      <ul className="mt-5 space-y-2 rounded-xl bg-zinc-100 p-3.5 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                        {result.explanations.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    ) : null}
                  </motion.div>
                </Dialog.Content>
              </div>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}

function FlowLine({
  title,
  labels,
  empty,
}: {
  title: string;
  labels: string[];
  empty: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      {labels.length ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {labels.map((label, index) => (
            <span key={`${label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 ? <ArrowRight className="size-3.5 shrink-0 text-zinc-400" /> : null}
              {label}
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-zinc-500">{empty}</p>
      )}
    </div>
  );
}
