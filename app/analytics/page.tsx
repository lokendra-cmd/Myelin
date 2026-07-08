import Link from "next/link";
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
        <h1 className="mt-2 text-4xl font-semibold tracking-normal">Performance</h1>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Average Productivity" value={`${data.averageProductivity}%`} />
        <Metric label="Longest Streak" value={`${data.longestStreak} days`} />
        <Metric label="Best Day" value={data.bestDay ? prettyDate(data.bestDay.date, "short") : "None"} href={data.bestDay ? `/sprints/${data.bestDay._id}` : undefined} />
        <Metric label="Worst Day" value={data.worstDay ? prettyDate(data.worstDay.date, "short") : "None"} href={data.worstDay ? `/sprints/${data.worstDay._id}` : undefined} />
      </div>
      <AnalyticsCharts data={data} />
    </main>
  );
}

function Metric({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = <Card className="p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></Card>;
  return href ? <Link href={href}>{body}</Link> : body;
}
