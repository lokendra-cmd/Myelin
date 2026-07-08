import Link from "next/link";
import { getWeeklyReview } from "@/actions/sprints";
import { Card } from "@/components/ui/card";
import { prettyDate } from "@/utils/date";
import { productivityMood } from "@/utils/productivity";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const sprints = await getWeeklyReview();
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div>
        <p className="text-sm text-zinc-500">Weekly Review</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal">Myelin History</h1>
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="grid grid-cols-[1.2fr_.7fr_.7fr_.8fr_1.5fr_.4fr] border-b border-zinc-200 px-4 py-3 text-xs font-medium text-zinc-500 dark:border-zinc-800">
          <span>Date</span><span>Completed</span><span>Total</span><span>Productivity</span><span>Reflection Preview</span><span>Mood</span>
        </div>
        {sprints.map((sprint) => {
          const mood = productivityMood(sprint.productivity);
          const reflection = sprint.reflection.wentWell || sprint.reflection.distracted || sprint.reflection.improve || "No reflection";
          return (
            <Link key={sprint._id} href={`/sprints/${sprint._id}`} className="grid grid-cols-[1.2fr_.7fr_.7fr_.8fr_1.5fr_.4fr] px-4 py-3 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <span>{prettyDate(sprint.date, "short")}</span>
              <span>{sprint.completedTasks}</span>
              <span>{sprint.totalTasks}</span>
              <span>{sprint.productivity}%</span>
              <span className="truncate text-zinc-500">{reflection}</span>
              <span>{mood.emoji}</span>
            </Link>
          );
        })}
      </Card>
    </main>
  );
}
