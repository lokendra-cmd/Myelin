import Link from "next/link";
import { Suspense, type ElementType } from "react";
import { Activity, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { getAnalytics } from "@/actions/sprints";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { CalorieTrackerAnalytics } from "@/components/calorie-tracker-analytics";
import { AnalyticsRangeFilter } from "@/components/analytics-range-filter";
import { HabitAnalytics } from "@/components/habit-analytics";
import { Card } from "@/components/ui/card";
import { prettyDate } from "@/utils/date";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const data = await getAnalytics(params);
  const rangeLabel =
    data.range === "all"
      ? "All time"
      : data.range === "custom" && data.from && data.to
        ? `${prettyDate(data.from, "short")} – ${prettyDate(data.to, "short")}`
        : data.range === "30"
          ? "Last 30 days"
          : "Last 7 days";

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Analytics · {rangeLabel}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">Performance</h1>
        </div>
        <Suspense fallback={null}>
          <AnalyticsRangeFilter range={data.range} from={data.from} to={data.to} />
        </Suspense>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Average Productivity" value={`${data.averageProductivity}%`} icon={Activity} />
        <Metric label="Current Streak" value={`${data.longestStreak} days`} icon={Flame} />
        <Metric
          label="Best Day"
          value={data.bestDay ? prettyDate(data.bestDay.date, "short") : "None"}
          href={data.bestDay ? `/sprints/${data.bestDay._id}` : undefined}
          icon={TrendingUp}
        />
        <Metric
          label="Worst Day"
          value={data.worstDay ? prettyDate(data.worstDay.date, "short") : "None"}
          href={data.worstDay ? `/sprints/${data.worstDay._id}` : undefined}
          icon={TrendingDown}
        />
      </div>
      <AnalyticsCharts data={data} />
      <CalorieTrackerAnalytics data={data} />
      <HabitAnalytics habits={data.habits} />
    </main>
  );
}

function Metric({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon: ElementType;
}) {
  const body = (
    <Card className="rounded-2xl p-4">
      <div className="mb-3 grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-4" />
      </div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold sm:text-2xl">{value}</p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
