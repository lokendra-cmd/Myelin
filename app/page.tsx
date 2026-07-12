import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/actions/sprints";
import { Card } from "@/components/ui/card";
import { getServerTimeZone } from "@/utils/dateServer";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const data = await getDashboardData();
    const tz = await getServerTimeZone();
    return <Dashboard data={data} timeZone={tz} />;
  } catch (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-semibold">Connect MongoDB to start Myelin</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Set `MONGODB_URI` in `.env.local`, then restart the dev server.</p>
          <p className="mt-6 text-xs text-zinc-400">{error instanceof Error ? error.message : "Database unavailable"}</p>
        </Card>
      </main>
    );
  }
}
