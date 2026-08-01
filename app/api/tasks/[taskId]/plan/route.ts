import { NextResponse } from "next/server";
import { getTaskPlanPage, updatePlan } from "@/actions/task-plans";

type Ctx = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const page = await getTaskPlanPage(taskId);
    return NextResponse.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load plan";
    const status = message === "Task not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const plan = await updatePlan(taskId, body);
    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
