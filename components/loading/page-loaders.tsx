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

export function MentalToolkitPageLoader() {
  return (
    <Shell label="Loading mental toolkit" className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bone className="size-12 rounded-2xl" />
          <Bone className="h-8 w-44" />
        </div>
        <Bone className="h-10 w-32 rounded-xl" />
      </div>
      <Bone className="h-20 rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Bone key={i} className="h-[68px] rounded-2xl" />
        ))}
      </div>
    </Shell>
  );
}

export function SprintPageLoader() {
  return (
    <Shell label="Loading myelination" className="min-w-0 space-y-5 overflow-x-hidden">
      <div className="space-y-2">
        <Bone className="h-4 w-28" />
        <Bone className="h-9 w-64 max-w-full" />
      </div>
      <Bone className="h-32 w-full rounded-2xl lg:hidden" />
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          <Bone className="h-40 rounded-2xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-16 rounded-2xl" />
          ))}
          <Bone className="h-28 rounded-2xl lg:hidden" />
          <Bone className="h-36 rounded-2xl lg:hidden" />
        </div>
        <div className="hidden space-y-4 lg:block">
          <Bone className="h-40 rounded-2xl" />
          <Bone className="h-36 rounded-2xl" />
          <Bone className="h-52 rounded-2xl" />
        </div>
      </div>
    </Shell>
  );
}

export function TaskPlanPageLoader() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-40 pt-4 sm:px-6 md:pb-28 lg:px-8">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <ProgressRail />
          <LoadingMark label="Loading plan" />
        </motion.div>

        <motion.section
          variants={item}
          className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="relative h-44 sm:h-56 md:h-64">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 via-zinc-100 to-emerald-100/40 dark:from-zinc-900 dark:via-zinc-950 dark:to-emerald-950/30" />
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.18),_transparent_55%)]"
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <CoverPulseMark />
            </div>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
              <Bone className="h-8 w-28 rounded-full" />
              <div className="flex gap-1.5">
                <Bone className="size-9 rounded-full" />
                <Bone className="size-9 rounded-full" />
                <Bone className="size-9 rounded-full" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 sm:p-6">
              <Bone className="h-8 w-2/3 max-w-md rounded-xl" />
              <Bone className="h-4 w-1/2 max-w-sm rounded-lg" />
              <div className="flex gap-2">
                <Bone className="h-7 w-24 rounded-full" />
                <Bone className="h-7 w-20 rounded-full" />
                <Bone className="h-7 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <Bone className="h-5 w-28 rounded-lg" />
              <Bone className="h-9 w-28 rounded-xl" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-[72px] rounded-2xl" />
            ))}
          </div>
          <aside className="hidden space-y-3 lg:block">
            <Bone className="h-56 rounded-2xl" />
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

function CoverPulseMark() {
  return (
    <div className="relative grid size-14 place-items-center">
      <motion.span
        className="absolute inset-0 rounded-2xl border border-emerald-400/35"
        animate={{ scale: [1, 1.28, 1], opacity: [0.55, 0, 0.55] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute inset-1 rounded-xl border border-emerald-500/30"
        animate={{ scale: [1, 1.16, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      <motion.span
        className="grid size-10 place-items-center rounded-xl bg-zinc-950/90 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 backdrop-blur dark:bg-white/90 dark:text-zinc-950"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        M
      </motion.span>
    </div>
  );
}
