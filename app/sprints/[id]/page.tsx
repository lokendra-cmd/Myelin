import { notFound } from "next/navigation";
import { getCategories, getSprint } from "@/actions/sprints";
import { SprintWorkspace } from "@/components/sprint-workspace";

export const dynamic = "force-dynamic";

export default async function SprintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [sprint, categories] = await Promise.all([getSprint(id), getCategories()]);
  if (!sprint) notFound();
  return <SprintWorkspace initialSprint={sprint} initialCategories={categories} quickAdd={query.new === "1"} />;
}
