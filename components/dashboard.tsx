import Link from "next/link";
import type React from "react";
import { ArrowRight, Flame, Sparkles, Target, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NewSprintButton } from "@/components/new-sprint-button";
import { ProgressRing } from "@/components/progress-ring";
import type { DashboardData } from "@/types/sprint";
import { prettyDate, greeting } from "@/utils/date";
import { productivityMood } from "@/utils/productivity";

export function Dashboard({ data }: { data: DashboardData }) {
  const today = data.today;
  const highlightTasks = today?.tasks.filter((task) => today.highlightTaskIds.includes(task._id)) ?? [];

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500">{prettyDate(new Date())}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal">{greeting()}, Lokendra</h1>
          </div>
          <NewSprintButton />
        </div>

        <Card className="overflow-hidden p-6">
          {today ? (
            <div className="grid gap-6 md:grid-cols-[1fr_220px]">
              <div>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Sparkles className="size-4" />
                  Current Myelin
                </div>
                <Link href={`/sprints/${today._id}`} className="mt-3 inline-flex items-center gap-2 text-2xl font-semibold hover:underline">
                  {today.title}
                  <ArrowRight className="size-5" />
                </Link>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <Stat icon={Target} label="Completed" value={`${today.completedTasks}/${today.totalTasks}`} />
                  <Stat icon={Flame} label="Streak" value={`${data.currentStreak} days`} />
                  <Stat icon={Trophy} label="Highlights" value={highlightTasks.length ? `${highlightTasks.length} selected` : "Unset"} />
                </div>
              </div>
              <div className="grid place-items-center">
                <ProgressRing value={today.productivity} />
              </div>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold">No sprint for today</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">Start clean. Recurring tasks will come along automatically.</p>
              <div className="mt-6"><NewSprintButton label="Create Today's Myelin" /></div>
            </div>
          )}
        </Card>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500">Last 7 Days</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.recent.map((sprint) => {
              const mood = productivityMood(sprint.productivity);
              return (
                <Link key={sprint._id} href={`/sprints/${sprint._id}`}>
                  <Card className="p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">{prettyDate(sprint.date, "short")}</span>
                      <span>{mood.emoji}</span>
                    </div>
                    <div className="mt-5 text-3xl font-semibold">{sprint.productivity}%</div>
                    <div className="mt-1 text-xs text-zinc-500">{sprint.completedTasks}/{sprint.totalTasks} complete</div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </section>

      <aside className="space-y-6">
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-500">Today&apos;s Highlights</p>
          <div className="mt-4 min-h-28 rounded-md bg-zinc-100 p-4 dark:bg-zinc-900">
            {highlightTasks.length ? (
              <>
                <p className="text-lg font-semibold">{highlightTasks.filter((task) => task.completed).length === highlightTasks.length ? "🎉 All highlights done" : "Active highlights"}</p>
                <p className="mt-2 text-sm text-zinc-500">{highlightTasks.map((task) => task.title).join(" · ")}</p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Choose one or more tasks inside today&apos;s sprint.</p>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-500">Quick Stats</p>
          <div className="mt-4 space-y-4">
            <Metric label="Average last 7" value={`${average(data.recent)}%`} />
            <Metric label="Best recent" value={`${Math.max(0, ...data.recent.map((s) => s.productivity))}%`} />
            <Metric label="Recurring tasks" value={`${today?.tasks.filter((task) => task.isRecurring).length ?? 0}`} />
          </div>
        </Card>
      </aside>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-900">
      <Icon className="size-4 text-zinc-500" />
      <div className="mt-3 truncate text-sm font-medium">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-sm"><span className="text-zinc-500">{label}</span><span className="font-medium">{value}</span></div>;
}

function average(sprints: DashboardData["recent"]) {
  if (!sprints.length) return 0;
  return Math.round(sprints.reduce((sum, sprint) => sum + sprint.productivity, 0) / sprints.length);
}
