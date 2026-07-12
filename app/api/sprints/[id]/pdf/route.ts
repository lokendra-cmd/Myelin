import { getSprint } from "@/actions/sprints";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tz = searchParams.get("tz") || "UTC";
  const sprint = await getSprint(id);
  if (!sprint) return new Response("Not found", { status: 404 });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(sprint.title)}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:40px;color:#111}li{margin:8px 0}.muted{color:#666}</style></head><body><h1>${escapeHtml(sprint.title)}</h1><p class="muted">${sprint.date} · ${sprint.productivity}% · ${sprint.completedTasks}/${sprint.totalTasks}</p><h2>Tasks</h2><ul>${sprint.tasks.map((task) => `<li>${task.completed ? "☑" : "☐"} ${escapeHtml(task.title)} <span class="muted">${escapeHtml(task.category)}${task.deadlineAt ? ` · due ${escapeHtml(formatDeadline(task.deadlineAt, tz))}` : ""}</span></li>`).join("")}</ul><h2>Reflection</h2><p><strong>Went well:</strong> ${escapeHtml(sprint.reflection.wentWell || "-")}</p><p><strong>Distracted:</strong> ${escapeHtml(sprint.reflection.distracted || "-")}</p><p><strong>Improve:</strong> ${escapeHtml(sprint.reflection.improve || "-")}</p><script>window.print()</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);
}

function formatDeadline(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}
