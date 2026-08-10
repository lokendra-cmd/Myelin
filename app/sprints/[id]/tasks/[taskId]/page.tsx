import { TaskPlanPage } from "@/components/task-plan/task-plan-page";

export const dynamic = "force-dynamic";

export default async function TaskPlanRoute({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: sprintId, taskId } = await params;
  // Render the client shell immediately — plan data streams in via fetch
  // so the cover image and page chrome are never blocked on MongoDB.
  return <TaskPlanPage sprintId={sprintId} taskId={taskId} />;
}
