"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKcal, hasMacroData, macroCalories, type NutritionTotals } from "@/lib/nutrition";

type NutritionSummaryProps = {
  totals: NutritionTotals;
  targets?: Partial<NutritionTotals> | null;
  variant?: "banner" | "panel" | "inline";
  className?: string;
  accentText?: string;
};

function MacroPill({ label, value, className }: { label: string; value: number; className?: string }) {
  if (value <= 0) return null;
  return (
    <span className={cn("tabular-nums", className)}>
      <span className="opacity-60">{label}</span> {Math.round(value)}g
    </span>
  );
}

function ProgressValue({ current, target, unit }: { current: number; target?: number | null; unit?: string }) {
  if (!target || target <= 0) return null;
  return (
    <span className="tabular-nums">
      {Math.round(current)}/{Math.round(target)}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}

export function NutritionSummary({ totals, targets, variant = "inline", className, accentText }: NutritionSummaryProps) {
  const macroKcal = macroCalories(totals);
  const showMacros = hasMacroData(totals);
  const hasTargets = Boolean(
    (targets?.calories ?? 0) > 0 ||
    (targets?.protein ?? 0) > 0 ||
    (targets?.fat ?? 0) > 0 ||
    (targets?.carbs ?? 0) > 0,
  );

  if (totals.calories <= 0 && !showMacros) {
    if (variant === "banner") {
      return (
        <p className={cn("mt-2 text-[11px] opacity-60", accentText, className)}>
          No meals logged yet
        </p>
      );
    }
    return null;
  }

  if (variant === "banner") {
    return (
      <div className={cn("mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold tabular-nums", accentText)}>
          <Flame className="size-3 opacity-80" />
          {hasTargets && (targets?.calories ?? 0) > 0
            ? <ProgressValue current={totals.calories} target={targets?.calories} unit="kcal" />
            : `${formatKcal(totals.calories)} kcal`}
        </span>
        {(showMacros || hasTargets) && (
          <span className={cn("flex flex-wrap items-center gap-x-2.5 text-[11px] opacity-75", accentText)}>
            {(targets?.protein ?? 0) > 0 ? (
              <ProgressValue current={totals.protein} target={targets?.protein} unit="P" />
            ) : (
              <MacroPill label="P" value={totals.protein} />
            )}
            {(targets?.fat ?? 0) > 0 ? (
              <ProgressValue current={totals.fat} target={targets?.fat} unit="F" />
            ) : (
              <MacroPill label="F" value={totals.fat} />
            )}
            {(targets?.carbs ?? 0) > 0 ? (
              <ProgressValue current={totals.carbs} target={targets?.carbs} unit="C" />
            ) : (
              <MacroPill label="C" value={totals.carbs} />
            )}
          </span>
        )}
      </div>
    );
  }

  if (variant === "panel") {
    if (totals.calories <= 0 && !showMacros) {
      return (
        <div className={cn("rounded-xl border border-dashed border-orange-200/60 bg-orange-50/30 px-3.5 py-3 dark:border-orange-950/30 dark:bg-orange-950/10", className)}>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Flame className="size-3.5 text-orange-400" />
            No meals logged today
          </div>
        </div>
      );
    }
    return (
      <div className={cn("rounded-xl border border-orange-100/80 bg-gradient-to-br from-orange-50/80 to-amber-50/40 px-3.5 py-3 dark:border-orange-950/40 dark:from-orange-950/20 dark:to-amber-950/10", className)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/50">
              <Flame className="size-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Today&apos;s intake</span>
          </div>
          <span className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatKcal(totals.calories)}
            <span className="ml-0.5 text-xs font-medium text-zinc-400">kcal</span>
          </span>
        </div>
        {showMacros && (
          <div className="mt-2.5 flex items-center justify-between border-t border-orange-100/60 pt-2.5 text-[11px] text-zinc-500 dark:border-orange-950/30 dark:text-zinc-400">
            <div className="flex gap-3">
              <MacroPill label="Protein" value={totals.protein} />
              <MacroPill label="Fat" value={totals.fat} />
              <MacroPill label="Carbs" value={totals.carbs} />
            </div>
            {macroKcal > 0 && (
              <span className="tabular-nums opacity-60">{formatKcal(macroKcal)} from macros</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400", className)}>
      <Flame className="size-3 text-orange-500" />
      <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{formatKcal(totals.calories)} kcal</span>
      {showMacros && (
        <span className="flex gap-2 opacity-75">
          <MacroPill label="P" value={totals.protein} />
          <MacroPill label="F" value={totals.fat} />
          <MacroPill label="C" value={totals.carbs} />
        </span>
      )}
    </span>
  );
}
