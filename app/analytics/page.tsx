import Link from "next/link";
import type React from "react";
import { Activity, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { getAnalytics } from "@/actions/sprints";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { Card } from "@/components/ui/card";
import { prettyDate } from "@/utils/date";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalytics();
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <p className="text-sm text-zinc-500">Monthly Analytics</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">Performance</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric
          label="Average Productivity"
          value={`${data.averageProductivity}%`}
          icon={Activity}
        />
        <Metric
          label="Longest Streak"
          value={`${data.longestStreak} days`}
          icon={Flame}
        />
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
  icon: React.ElementType;
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
