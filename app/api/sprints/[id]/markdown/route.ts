import { getSprint } from "@/actions/sprints";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const sprint = await getSprint(id);
  if (!sprint) return new Response("Not found", { status: 404 });
  const lines = [
    `# ${sprint.title}`,
    "",
    `Date: ${sprint.date}`,
    `Productivity: ${sprint.productivity}% (${sprint.completedTasks}/${sprint.totalTasks})`,
    "",
    "## Tasks",
    ...sprint.tasks.map((task) => {
      const meta = [task.category, task.isRecurring ? "recurring" : "", task.deadlineAt ? `due ${formatDeadline(task.deadlineAt)}` : ""].filter(Boolean).join(", ");
      return `- [${task.completed ? "x" : " "}] ${task.title} (${meta})`;
    }),
    "",
    "## Reflection",
    `- Went well: ${sprint.reflection.wentWell || "-"}`,
    `- Distracted: ${sprint.reflection.distracted || "-"}`,
    `- Improve: ${sprint.reflection.improve || "-"}`,
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${sprint.date}-sprint.md"`,
    },
  });
}

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
