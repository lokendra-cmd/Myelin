import { getWeeklyReview } from "@/actions/sprints";
import { Card } from "@/components/ui/card";
import { ReviewList } from "@/components/ReviewList";

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
        <ReviewList initialSprints={sprints} />
      </Card>
    </main>
  );
}
