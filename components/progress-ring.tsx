"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 168,
  showLabel = true,
  className,
}: {
  value: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const labelSize = size < 80 ? "text-xs" : size < 120 ? "text-sm" : "text-4xl";

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={radius} className="fill-none stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="10" />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          className="fill-none stroke-accent"
          strokeLinecap="round"
          strokeWidth="10"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (value / 100) * circumference }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          strokeDasharray={circumference}
        />
      </svg>
      {showLabel ? (
        <div className={cn("absolute font-semibold tracking-normal text-zinc-950 dark:text-zinc-50", labelSize)}>
          {value}%
        </div>
      ) : null}
    </div>
  );
}
