import { notFound } from "next/navigation";
import { getTaskPlanPage } from "@/actions/task-plans";
import { TaskPlanPage } from "@/components/task-plan/task-plan-page";

export const dynamic = "force-dynamic";

export default async function TaskPlanRoute({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: sprintId, taskId } = await params;

  let page;
  try {
    page = await getTaskPlanPage(taskId);
  } catch {
    notFound();
  }

  if (page.task.sprintId !== sprintId) notFound();

  return <TaskPlanPage initial={page} sprintId={sprintId} />;
}
