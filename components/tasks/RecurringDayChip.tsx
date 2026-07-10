"use client";

import { motion } from "framer-motion";
import { Sun, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurringDayChipProps {
  dayName: string;
  dayValue: number;
  selected: boolean;
  onClick: () => void;
  activeClass: string;
  iconClass: string;
  badgeClass: string;
}

export function RecurringDayChip({
  dayName,
  selected,
  onClick,
  activeClass,
  iconClass,
  badgeClass,
}: RecurringDayChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 p-4 h-24 rounded-2xl border bg-white dark:bg-zinc-950 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
        selected
          ? activeClass
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-300"
      )}
      aria-label={`Toggle repeat on ${dayName}`}
      aria-pressed={selected}
    >
      {/* Sun Icon */}
      <Sun className={cn("size-6 stroke-[2]", selected ? iconClass : "text-zinc-400 dark:text-zinc-500")} />

      {/* Weekday Label */}
      <span className="text-xs font-semibold tracking-tight">{dayName}</span>

      {/* Selection Check Badge */}
      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className={cn(
            "absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full shadow-sm",
            badgeClass
          )}
        >
          <Check className="size-3 stroke-[3] text-white" />
        </motion.div>
      )}
    </motion.button>
  );
}
