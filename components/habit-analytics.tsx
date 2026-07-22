"use client";

import { AlertCircle, CheckCircle2, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { HabitStat } from "@/types/sprint";

function HabitRow({ habit }: { habit: HabitStat }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{habit.title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{habit.categoryLabel}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{habit.hitRate}%</p>
        <p className="mt-0.5 text-xs text-zinc-500 tabular-nums">
          {habit.completedCount}/{habit.appearanceCount}
          {habit.daysSinceLastDone != null ? ` · ${habit.daysSinceLastDone}d ago` : " · never"}
        </p>
      </div>
    </div>
  );
}

export function HabitAnalytics({ habits }: { habits: HabitStat[] }) {
  const ignored = habits
    .filter(
      (habit) =>
        habit.appearanceCount >= 2 &&
        (habit.hitRate < 40 || (habit.daysSinceLastDone != null && habit.daysSinceLastDone >= 3)),
    )
    .sort(
      (a, b) =>
        (b.daysSinceLastDone ?? 999) - (a.daysSinceLastDone ?? 999) || a.hitRate - b.hitRate,
    );

  const strong = habits
    .filter((habit) => habit.appearanceCount >= 2 && habit.hitRate >= 80)
    .sort((a, b) => b.hitRate - a.hitRate || b.completedCount - a.completedCount);

  const byCategory = new Map<string, HabitStat[]>();
  for (const habit of habits) {
    const key = habit.categoryLabel;
    const bucket = byCategory.get(key);
    if (bucket) bucket.push(habit);
    else byCategory.set(key, [habit]);
  }

  if (habits.length === 0) {
    return (
      <Card className="rounded-2xl p-5">
        <p className="text-sm text-zinc-500">
          No recurring habits in this range. One-off tasks (like filing ITR or making a reel) are
          excluded from habit performance so they don’t look like skipped routines.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Ignoring / stale</h2>
              <p className="text-xs text-zinc-500">Recurring habits you haven’t been completing</p>
            </div>
          </div>
          <div className="mt-2">
            {ignored.length === 0 ? (
              <p className="py-4 text-sm text-zinc-500">Nothing stale in this range.</p>
            ) : (
              ignored.map((habit) => <HabitRow key={habit.habitId} habit={habit} />)
            )}
          </div>
        </Card>

        <Card className="rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Doing consistently</h2>
              <p className="text-xs text-zinc-500">Habits at 80%+ completion in this range</p>
            </div>
          </div>
          <div className="mt-2">
            {strong.length === 0 ? (
              <p className="py-4 text-sm text-zinc-500">No strong habits yet in this range.</p>
            ) : (
              strong.map((habit) => <HabitRow key={habit.habitId} habit={habit} />)
            )}
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <Layers className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Per-task by category</h2>
            <p className="text-xs text-zinc-500">
              Times completed vs times scheduled (recurring habits only)
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-5">
          {Array.from(byCategory.entries()).map(([label, items]) => (
            <div key={label}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
              {items
                .slice()
                .sort((a, b) => b.completedCount - a.completedCount)
                .map((habit) => (
                  <HabitRow key={habit.habitId} habit={habit} />
                ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
