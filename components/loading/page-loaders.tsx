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
    <div className="mb-6 flex items-center gap-3">
      <div className="relative grid size-9 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full border border-zinc-300/80 dark:border-zinc-700"
          animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-1 rounded-full border border-zinc-400/50 dark:border-zinc-600"
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
    <div className="mb-6 h-[2px] w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
      <motion.div
        className="h-full w-1/3 rounded-full bg-zinc-950 dark:bg-zinc-100"
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
    <Shell label="Loading today" className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Bone className="h-4 w-40" />
            <Bone className="h-10 w-72 max-w-full" />
          </div>
          <Bone className="h-9 w-36" />
        </div>

        <motion.div
          variants={item}
          className="overflow-hidden rounded-lg border border-zinc-200/80 bg-white/70 p-6 dark:border-zinc-800 dark:bg-zinc-950/60"
        >
          <div className="grid gap-6 md:grid-cols-[1fr_220px]">
            <div className="space-y-6">
              <Bone className="h-4 w-36" />
              <Bone className="h-8 w-56" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Bone className="h-20" />
                <Bone className="h-20" />
                <Bone className="h-20" />
              </div>
            </div>
            <div className="grid place-items-center">
              <motion.div
                className="size-36 rounded-full border-[10px] border-zinc-200 border-t-zinc-950 dark:border-zinc-800 dark:border-t-zinc-100"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>

        <div>
          <Bone className="mb-3 h-4 w-24" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <Bone className="h-40" />
        <Bone className="h-44" />
      </aside>
    </Shell>
  );
}

export function ReviewPageLoader() {
  return (
    <Shell label="Loading review">
      <div className="space-y-3">
        <Bone className="h-4 w-28" />
        <Bone className="h-10 w-64" />
      </div>
      <motion.div
        variants={item}
        className="mt-6 overflow-hidden rounded-lg border border-zinc-200/80 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
      >
        <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              variants={item}
              className="flex items-center gap-4 px-4 py-4 sm:px-5"
            >
              <Shimmer className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Shimmer className="h-4 w-40 max-w-[50%]" />
                <Shimmer className="h-3 w-24 max-w-[35%]" />
              </div>
              <Shimmer className="h-6 w-14" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Shell>
  );
}

export function AnalyticsPageLoader() {
  return (
    <Shell label="Loading analytics" className="space-y-6">
      <div className="space-y-3">
        <Bone className="h-4 w-32" />
        <Bone className="h-10 w-52" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Bone className="h-72" />
        <Bone className="h-72" />
      </div>
    </Shell>
  );
}

export function BrainDumpPageLoader() {
  return (
    <Shell label="Loading brain dump" className="space-y-6">
      <div className="space-y-3">
        <Bone className="h-4 w-28" />
        <Bone className="h-10 w-56" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} className="h-44" />
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
              className="rounded-lg border border-zinc-200/80 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
            >
              <Shimmer className="mb-4 h-5 w-28" />
              <div className="space-y-3">
                <Shimmer className="h-12 w-full" />
                <Shimmer className="h-12 w-full" />
                <Shimmer className="h-12 w-[85%]" />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="space-y-4">
          <Bone className="h-40" />
          <Bone className="h-52" />
        </div>
      </div>
    </Shell>
  );
}
