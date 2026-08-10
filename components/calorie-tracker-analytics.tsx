"use client";

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AnalyticsData } from "@/types/sprint";

const ORANGE = "#f97316";

function pct(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export function CalorieTrackerAnalytics({ data }: { data: AnalyticsData }) {
  if (!data.calorieTrackers.length) return null;

  return (
    <section className="space-y-4 lg:space-y-6">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
          <Flame className="size-4" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Calories Tracker</h2>
      </div>

      <Card className="rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Daily Calorie Intake Trend</p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">kcal/day</span>
        </div>
        <div className="mt-4 h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailyCalories}>
              <defs>
                <linearGradient id="calorieFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ORANGE} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={ORANGE} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="calories"
                stroke={ORANGE}
                strokeWidth={2.5}
                fill="url(#calorieFill)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#94a3b8"
                strokeWidth={1.75}
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="space-y-4">
        {data.calorieTrackers.map((tracker) => {
          const hasAnyTarget =
            tracker.targets.calories > 0 ||
            tracker.targets.protein > 0 ||
            tracker.targets.fat > 0 ||
            tracker.targets.carbs > 0;

          return (
            <Card key={tracker.category} className="rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{tracker.label}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Day-wise target vs achieved</p>
                </div>
                <div className="grid size-9 place-items-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                  <Target className="size-4" />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Day-wise Progress</p>
                <div className="mt-2.5 space-y-3">
                  {tracker.daily.map((day) => {
                    const dayPct = pct(day.achieved.calories, day.target.calories);
                    return (
                      <div key={`${tracker.category}-${day.date}`} className="rounded-lg border border-zinc-200/70 bg-white/80 p-2.5 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <div className="mb-2 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-zinc-500 dark:text-zinc-400">{day.date}</span>
                          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                            Goal tracking
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-500 dark:text-zinc-400">Calories</span>
                              <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-100">
                                {Math.round(day.achieved.calories)}
                                {day.target.calories > 0 ? <span className="text-zinc-400">/{Math.round(day.target.calories)}</span> : null}
                              </span>
                            </div>
                            {day.target.calories > 0 ? (
                              <div className="h-1.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800">
                                <div
                                  className="h-1.5 rounded-full bg-orange-500 transition-all"
                                  style={{ width: `${dayPct}%` }}
                                />
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-500 dark:text-zinc-400">Protein</span>
                              <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-100">
                                {Math.round(day.achieved.protein)}
                                {day.target.protein > 0 ? <span className="text-zinc-400">/{Math.round(day.target.protein)}</span> : null}g
                              </span>
                            </div>
                            {day.target.protein > 0 ? (
                              <div className="h-1.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800">
                                <div
                                  className="h-1.5 rounded-full bg-violet-500 transition-all"
                                  style={{ width: `${pct(day.achieved.protein, day.target.protein)}%` }}
                                />
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-500 dark:text-zinc-400">Fat</span>
                              <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-100">
                                {Math.round(day.achieved.fat)}
                                {day.target.fat > 0 ? <span className="text-zinc-400">/{Math.round(day.target.fat)}</span> : null}g
                              </span>
                            </div>
                            {day.target.fat > 0 ? (
                              <div className="h-1.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800">
                                <div
                                  className="h-1.5 rounded-full bg-sky-500 transition-all"
                                  style={{ width: `${pct(day.achieved.fat, day.target.fat)}%` }}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!hasAnyTarget && (
                <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Add targets on the category to see completion progress.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
