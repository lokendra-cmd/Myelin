"use client";

import { motion } from "framer-motion";
import { LucideIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurringPresetCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  colorTheme: "violet" | "amber" | "blue";
}

const THEME_STYLES = {
  violet: {
    activeBorder: "border-violet-500 bg-violet-50/30 dark:bg-violet-950/10",
    iconBg: "bg-violet-100/60 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    badgeBg: "bg-violet-500 text-white",
  },
  amber: {
    activeBorder: "border-amber-500 bg-amber-50/30 dark:bg-amber-950/10",
    iconBg: "bg-amber-100/60 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500 text-white",
  },
  blue: {
    activeBorder: "border-blue-500 bg-blue-50/30 dark:bg-blue-950/10",
    iconBg: "bg-blue-100/60 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-500 text-white",
  },
};

export function RecurringPresetCard({
  title,
  subtitle,
  icon: Icon,
  active,
  onClick,
  colorTheme,
}: RecurringPresetCardProps) {
  const theme = THEME_STYLES[colorTheme];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        "relative flex items-center gap-3.5 p-4 rounded-2xl border bg-white dark:bg-zinc-950 text-left transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 w-full",
        active
          ? theme.activeBorder
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      )}
    >
      {/* Icon Wrapper */}
      <div className={cn("grid size-12 place-items-center rounded-xl shrink-0 transition-colors", active ? theme.iconBg : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400")}>
        <Icon className="size-5.5 stroke-[2]" />
      </div>

      {/* Info labels */}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">{title}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{subtitle}</span>
      </div>

      {/* Selection Badge */}
      {active && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className={cn("absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full shadow-sm", theme.badgeBg)}
        >
          <Check className="size-3 stroke-[3] text-white" />
        </motion.div>
      )}
    </motion.button>
  );
}
