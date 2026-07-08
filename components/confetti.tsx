"use client";

import { motion } from "framer-motion";

export function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 36 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute size-2 rounded-sm bg-zinc-950 dark:bg-zinc-50"
          style={{ left: `${(index * 29) % 100}%`, top: "-2%" }}
          initial={{ y: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", rotate: 360, opacity: 0 }}
          transition={{ duration: 1.8, delay: (index % 9) * 0.03, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
