"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AccentColor = "violet" | "amber" | "red" | "emerald" | "blue" | "zinc";

const ACCENT_CLASSES: Record<
  AccentColor,
  { hover: string; active: string; icon: string; ring: string }
> = {
  violet: {
    hover: "hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:text-violet-600 dark:hover:text-violet-400",
    active: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
    icon: "text-violet-600 dark:text-violet-400",
    ring: "focus:ring-violet-500",
  },
  amber: {
    hover: "hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-500 dark:hover:text-amber-400",
    active: "bg-amber-100/70 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400",
    icon: "text-amber-500 dark:text-amber-400",
    ring: "focus:ring-amber-500",
  },
  red: {
    hover: "hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400",
    active: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
    icon: "text-red-600 dark:text-red-400",
    ring: "focus:ring-red-500",
  },
  emerald: {
    hover: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400",
    active: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    icon: "text-emerald-600 dark:text-emerald-400",
    ring: "focus:ring-emerald-500",
  },
  blue: {
    hover: "hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400",
    active: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    icon: "text-blue-600 dark:text-blue-400",
    ring: "focus:ring-blue-500",
  },
  zinc: {
    hover: "hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-700 dark:hover:text-zinc-300",
    active: "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300",
    icon: "text-zinc-700 dark:text-zinc-300",
    ring: "focus:ring-zinc-500",
  },
};

interface TaskActionIconProps {
  icon: LucideIcon;
  tooltip: string;
  active?: boolean;
  activeColor?: AccentColor;
  /** Color used only for the hover state (if different from active). Defaults to activeColor. */
  hoverColor?: AccentColor;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  /** Render the button as a wrapper around custom children (e.g. DeadlinePickerBox trigger) */
  asChild?: boolean;
}

export function TaskActionIcon({
  icon: Icon,
  tooltip,
  active = false,
  activeColor = "violet",
  hoverColor,
  onClick,
  disabled = false,
  className,
}: TaskActionIconProps) {
  const resolvedHover = ACCENT_CLASSES[hoverColor ?? activeColor];
  const resolvedActive = ACCENT_CLASSES[activeColor];

  return (
    <motion.button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? {} : { scale: 1.07 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className={cn(
        "size-8 rounded-full flex items-center justify-center transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-1",
        resolvedActive.ring,
        active
          ? resolvedActive.active
          : cn(
              "bg-transparent text-zinc-400 dark:text-zinc-500",
              resolvedHover.hover
            ),
        disabled && "opacity-40 pointer-events-none",
        className
      )}
    >
      <Icon className="size-4 stroke-[1.75]" />
    </motion.button>
  );
}
