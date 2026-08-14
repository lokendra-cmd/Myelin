import Link from "next/link";
import type React from "react";
import { ArrowRight, BarChart3, Flame, Sparkles, Star, Target, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NewSprintButton } from "@/components/new-sprint-button";
import { MyFlowWheel } from "@/components/my-flow-wheel";
import { ProgressRing } from "@/components/progress-ring";
import type { CategoryDTO, DashboardData } from "@/types/sprint";
import { prettyDate, greeting, formatSprintDate, isoDate } from "@/utils/date";
import { calculateMyFlow } from "@/utils/my-flow";
import { productivityMood } from "@/utils/productivity";
import { cn } from "@/lib/utils";

export function Dashboard({
  data,
  timeZone,
  userName,
  categories,
}: {
  data: DashboardData;
  timeZone: string;
  userName: string;
  categories: CategoryDTO[];
}) {
  const today = data.today;
  const todayDate = isoDate(undefined, timeZone);
  const highlightTasks = today?.tasks.filter((task) => today.highlightTaskIds.includes(task._id)) ?? [];
  const avg = average(data.recent);
  const best = data.recent.length ? Math.max(...data.recent.map((s) => s.productivity)) : 0;
  const recurring = today?.tasks.filter((task) => task.isRecurring).length ?? 0;
  const myFlow = today ? calculateMyFlow(categories, today.tasks) : null;

  const todayTitle = today?.title.startsWith("Sprint ") || today?.title.startsWith("Myelination ")
    ? `Myelination ${formatSprintDate(today.date)}`
    : today?.title;

  return (
    <main className="mx-auto grid w-full max-w-7xl min-w-0 gap-5 overflow-x-hidden px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px] lg:gap-6">
      <section className="min-w-0 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="hidden text-sm text-zinc-500 lg:block">{prettyDate(new Date(), "long", timeZone)}</p>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-4xl sm:font-semibold">
              {greeting(timeZone)}, {userName}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 lg:hidden">Let&apos;s keep the momentum going.</p>
          </div>
          <div className="hidden lg:block">
            <NewSprintButton />
          </div>
        </div>

        {/* Mobile primary CTA */}
        <div className="w-full min-w-0 lg:hidden">
          <NewSprintButton
            label="New Myelination"
            variant="accent"
            className="h-12 w-full max-w-full rounded-2xl text-[15px] font-semibold"
          />
        </div>

        {/* Current Myelination */}
        <Card className="overflow-hidden rounded-2xl border-zinc-200/80 p-4 shadow-sm sm:p-6">
          {today ? (
            <>
              {/* Mobile / tablet: stats left + ring right (matches mockup) */}
              <div className="lg:hidden">
                <div className="flex items-center gap-2 text-sm font-medium text-accent">
                  <Sparkles className="size-4 shrink-0" />
                  Current Myelination
                </div>
                <Link
                  href={`/sprints/${today._id}`}
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 text-lg font-bold tracking-tight hover:underline"
                >
                  <span className="truncate">{todayTitle}</span>
                  <ArrowRight className="size-4 shrink-0 text-zinc-400" />
                </Link>

                <div className="mt-5 flex min-w-0 items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-3">
                    <InlineStat icon={Target} value={`${today.completedTasks}/${today.totalTasks} Completed`} />
                    <InlineStat icon={Flame} value={`${data.currentStreak} days Streak`} />
                    <InlineStat
                      icon={Trophy}
                      value={highlightTasks.length ? `${highlightTasks.length} Highlights` : "Unset Highlights"}
                    />
                  </div>
                  <div className="relative size-[128px] shrink-0">
                    <ProgressRing value={today.productivity} size={128} showLabel={false} />
                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold tabular-nums leading-none">{today.productivity}%</div>
                        <div className="mt-1 text-[11px] font-medium text-zinc-500">Progress</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden gap-6 lg:grid lg:grid-cols-[1fr_220px] lg:items-center">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-accent">
                    <Sparkles className="size-4" />
                    Current Myelination
                  </div>
                  <Link
                    href={`/sprints/${today._id}`}
                    className="mt-3 inline-flex items-center gap-2 text-2xl font-semibold hover:underline"
                  >
                    {todayTitle}
                    <ArrowRight className="size-5 text-zinc-400" />
                  </Link>
                  <div className="mt-8 grid grid-cols-3 gap-3">
                    <Stat icon={Target} label="Completed" value={`${today.completedTasks}/${today.totalTasks}`} />
                    <Stat icon={Flame} label="Streak" value={`${data.currentStreak} days`} />
                    <Stat
                      icon={Trophy}
                      label="Highlights"
                      value={highlightTasks.length ? `${highlightTasks.length} selected` : "Unset"}
                    />
                  </div>
                </div>
                <div className="grid place-items-center">
                  <ProgressRing value={today.productivity} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold">No sprint for today</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Start clean. Recurring tasks will come along automatically.
              </p>
              <div className="mt-6">
                <NewSprintButton label="Create Myelination" variant="accent" />
              </div>
            </div>
          )}
        </Card>

        {myFlow ? (
          <div className="lg:hidden">
            <MyFlowWheel result={myFlow} size={112} />
          </div>
        ) : null}

        {/* Last 7 Days */}
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Last 7 Days</h2>
            <Link href="/review" className="text-sm font-semibold text-accent hover:underline">
              View all
            </Link>
          </div>

          {/* Horizontal scroll confined to viewport — do not use negative margins on a grid child */}
          <div className="min-w-0 lg:hidden">
            <div className="flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory scrollbar-none">
              {data.recent.map((sprint) => {
                const mood = productivityMood(sprint.productivity);
                const selected = sprint.date === todayDate;
                return (
                  <Link
                    key={sprint._id}
                    href={`/sprints/${sprint._id}`}
                    className={cn(
                      "flex w-[100px] shrink-0 snap-start flex-col rounded-2xl border bg-white p-3 shadow-sm transition dark:bg-zinc-950",
                      selected
                        ? "border-2 border-accent"
                        : "border-zinc-200/90 dark:border-zinc-800",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[11px] font-medium text-zinc-500">
                        {shortDay(sprint.date, timeZone)}
                      </span>
                      <span className="text-sm leading-none">{mood.emoji}</span>
                    </div>
                    <div className="mt-3 text-2xl font-bold tabular-nums leading-none">{sprint.productivity}%</div>
                    <div className="mt-1.5 text-[11px] text-zinc-500">
                      {sprint.completedTasks}/{sprint.totalTasks}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop grid */}
          <div className="hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-4">
            {data.recent.map((sprint) => {
              const mood = productivityMood(sprint.productivity);
              return (
                <Link key={sprint._id} href={`/sprints/${sprint._id}`}>
                  <Card className="p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">{prettyDate(sprint.date, "short", timeZone)}</span>
                      <span>{mood.emoji}</span>
                    </div>
                    <div className="mt-5 text-3xl font-semibold">{sprint.productivity}%</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {sprint.completedTasks}/{sprint.totalTasks} complete
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Mobile stacked aside sections */}
        <div className="space-y-4 lg:hidden">
          <HighlightsCard highlightTasks={highlightTasks} />
          <QuickStatsCard average={avg} best={best} recurring={recurring} />
        </div>
      </section>

      <aside className="hidden space-y-6 lg:block">
        {myFlow ? <MyFlowWheel result={myFlow} size={128} /> : null}
        <HighlightsCard highlightTasks={highlightTasks} />
        <QuickStatsCard average={avg} best={best} recurring={recurring} />
      </aside>
    </main>
  );
}

function shortDay(date: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: /^\d{4}-\d{2}-\d{2}$/.test(date) ? "UTC" : timeZone,
    }).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00Z` : date));
  } catch {
    return prettyDate(date, "short", timeZone);
  }
}

function HighlightsCard({
  highlightTasks,
}: {
  highlightTasks: NonNullable<DashboardData["today"]>["tasks"];
}) {
  return (
    <Card className="rounded-2xl p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <Star className="size-4 text-accent" />
        Today&apos;s Highlights
      </p>
      <div className="mt-3 min-h-[88px] rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
        {highlightTasks.length ? (
          <>
            <p className="text-base font-semibold">
              {highlightTasks.filter((task) => task.completed).length === highlightTasks.length
                ? "🎉 All highlights done"
                : "Active highlights"}
            </p>
            <p className="mt-2 text-sm text-zinc-500">{highlightTasks.map((task) => task.title).join(" · ")}</p>
          </>
        ) : (
          <p className="text-sm leading-6 text-zinc-500">
            Choose one or more tasks inside today&apos;s sprint to create highlights.
          </p>
        )}
      </div>
    </Card>
  );
}

function QuickStatsCard({
  average,
  best,
  recurring,
}: {
  average: number;
  best: number;
  recurring: number;
}) {
  return (
    <Card className="rounded-2xl p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <BarChart3 className="size-4 text-accent" />
        Quick Stats
      </p>
      <div className="mt-4 space-y-3.5">
        <MetricRow label="Average last 7" value={`${average}%`} />
        <MetricRow label="Best recent" value={`${best}%`} />
        <MetricRow label="Recurring tasks" value={String(recurring)} />
      </div>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="shrink-0 font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{value}</span>
    </div>
  );
}

function InlineStat({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-zinc-700 dark:text-zinc-200">
      <Icon className="size-4 shrink-0 text-accent" strokeWidth={2.25} />
      <span className="font-medium leading-none">{value}</span>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900">
      <Icon className="size-4 text-accent" />
      <div className="mt-3 truncate text-sm font-medium">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function average(sprints: DashboardData["recent"]) {
  if (!sprints.length) return 0;
  return Math.round(sprints.reduce((sum, sprint) => sum + sprint.productivity, 0) / sprints.length);
}
