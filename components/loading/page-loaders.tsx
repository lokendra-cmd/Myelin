"use client";

import { motion } from "framer-motion";
import { Shimmer } from "@/components/loading/shimmer";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease },
  },
};

function LoadingMark({ label }: { label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="relative grid size-9 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full border border-accent/30"
          animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-1 rounded-full border border-accent/40"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.25 }}
        />
        <motion.span
          className="grid size-7 place-items-center rounded-md bg-zinc-950 text-[11px] font-semibold text-white dark:bg-zinc-50 dark:text-zinc-950"
          animate={{ y: [0, -1.5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          M
        </motion.span>
      </div>
      <div>
        <motion.p
          className="text-sm font-medium text-zinc-800 dark:text-zinc-100"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.p>
        <p className="text-xs text-zinc-400">Preparing your workspace</p>
      </div>
    </div>
  );
}

function ProgressRail() {
  return (
    <div className="mb-5 h-[2px] w-full overflow-hidden rounded-full bg-accent-soft">
      <motion.div
        className="h-full w-1/3 rounded-full bg-accent"
        animate={{ x: ["-120%", "320%"] }}
        transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function Shell({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto max-w-7xl px-4 py-6 sm:px-6", className)}>
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={item}>
          <ProgressRail />
          <LoadingMark label={label} />
        </motion.div>
        {children}
      </motion.div>
    </main>
  );
}

function Bone({ className }: { className?: string }) {
  return (
    <motion.div variants={item}>
      <Shimmer className={className} />
    </motion.div>
  );
}

export function TodayPageLoader() {
  return (
    <Shell label="Loading today" className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div className="space-y-2">
          <Bone className="h-9 w-64 max-w-full rounded-xl" />
          <Bone className="h-4 w-48 lg:hidden" />
        </div>
        <Bone className="h-12 w-full rounded-2xl lg:hidden" />

        <motion.div
          variants={item}
          className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/60"
        >
          <div className="grid gap-5 md:grid-cols-[1fr_160px] md:items-center">
            <div className="space-y-4">
              <Bone className="h-4 w-36" />
              <Bone className="h-7 w-48" />
              <div className="space-y-3 md:hidden">
                <Bone className="h-4 w-40" />
                <Bone className="h-4 w-32" />
                <Bone className="h-4 w-36" />
              </div>
              <div className="hidden gap-3 md:grid md:grid-cols-3">
                <Bone className="h-20 rounded-xl" />
                <Bone className="h-20 rounded-xl" />
                <Bone className="h-20 rounded-xl" />
              </div>
            </div>
            <div className="grid place-items-center">
              <motion.div
                className="size-32 rounded-full border-[10px] border-zinc-200 border-t-accent dark:border-zinc-800"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>

        <div>
          <Bone className="mb-3 h-4 w-24" />
          <div className="-mx-4 flex gap-3 overflow-hidden px-4 lg:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-24 w-[108px] shrink-0 rounded-2xl" />
            ))}
          </div>
          <div className="hidden gap-3 lg:grid lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          <Bone className="h-36 rounded-2xl" />
          <Bone className="h-40 rounded-2xl" />
        </div>
      </div>

      <aside className="hidden space-y-6 lg:block">
        <Bone className="h-40 rounded-2xl" />
        <Bone className="h-44 rounded-2xl" />
      </aside>
    </Shell>
  );
}

export function ReviewPageLoader() {
  return (
    <Shell label="Loading review">
      <div className="space-y-3">
        <Bone className="h-4 w-28" />
        <Bone className="h-9 w-56" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Bone className="h-10 w-48 rounded-xl" />
        <Bone className="size-9 rounded-xl" />
      </div>
      <div className="mt-4 space-y-3 md:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="h-[72px] rounded-2xl" />
        ))}
        <Bone className="h-24 rounded-2xl" />
      </div>
      <motion.div
        variants={item}
        className="mt-4 hidden overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60 md:block"
      >
        <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div key={i} variants={item} className="flex items-center gap-4 px-4 py-4">
              <Shimmer className="h-4 w-28" />
              <Shimmer className="h-4 w-12" />
              <Shimmer className="h-4 w-12" />
              <Shimmer className="h-4 w-14" />
              <Shimmer className="h-4 flex-1" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Shell>
  );
}

export function AnalyticsPageLoader() {
  return (
    <Shell label="Loading analytics" className="space-y-5">
      <div className="space-y-3">
        <Bone className="h-4 w-32" />
        <Bone className="h-9 w-44" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Bone className="h-72 rounded-2xl" />
        <Bone className="h-72 rounded-2xl" />
      </div>
    </Shell>
  );
}

export function BrainDumpPageLoader() {
  return (
    <Shell label="Loading brain dump" className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bone className="size-12 rounded-2xl" />
          <Bone className="h-8 w-36" />
        </div>
        <Bone className="h-10 w-32 rounded-xl" />
      </div>
      <Bone className="h-20 rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="h-[68px] rounded-2xl" />
        ))}
      </div>
    </Shell>
  );
}

export function SprintPageLoader() {
  return (
    <Shell label="Loading myelination" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Bone className="h-4 w-32" />
          <Bone className="h-10 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-24" />
          <Bone className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              variants={item}
              className="rounded-2xl border border-zinc-200/80 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
            >
              <Shimmer className="mb-4 h-5 w-28" />
              <div className="space-y-3">
                <Shimmer className="h-12 w-full rounded-xl" />
                <Shimmer className="h-12 w-full rounded-xl" />
                <Shimmer className="h-12 w-[85%] rounded-xl" />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="space-y-4">
          <Bone className="h-40 rounded-2xl" />
          <Bone className="h-52 rounded-2xl" />
        </div>
      </div>
    </Shell>
  );
}
