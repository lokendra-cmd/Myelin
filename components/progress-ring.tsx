"use client";

import { motion } from "framer-motion";

export function ProgressRing({ value, size = 168 }: { value: number; size?: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={radius} className="fill-none stroke-zinc-200 dark:stroke-zinc-850" strokeWidth="10" />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          className="fill-none stroke-zinc-950 dark:stroke-zinc-50"
          strokeLinecap="round"
          strokeWidth="10"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (value / 100) * circumference }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute text-4xl font-semibold tracking-normal">{value}%</div>
    </div>
  );
}
