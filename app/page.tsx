import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/actions/sprints";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const data = await getDashboardData();
    return <Dashboard data={data} />;
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
