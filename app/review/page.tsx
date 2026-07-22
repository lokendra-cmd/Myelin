import { getWeeklyReview } from "@/actions/sprints";
import { ReviewList } from "@/components/ReviewList";
import { getServerTimeZone } from "@/utils/dateServer";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const sprints = await getWeeklyReview();
  const tz = await getServerTimeZone();
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div>
        <p className="text-sm text-zinc-500">Weekly Review</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">Myelin History</h1>
      </div>
      <div className="mt-6">
        <ReviewList initialSprints={sprints} timeZone={tz} />
      </div>
    </main>
  );
}
