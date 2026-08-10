import { NextResponse } from "next/server";
import { deletePlanStep, duplicatePlanStep, updatePlanStep } from "@/actions/task-plans";

type Ctx = { params: Promise<{ taskId: string; stepId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { taskId, stepId } = await params;
    const body = await request.json();
    const step = await updatePlanStep(taskId, stepId, body);
    return NextResponse.json(step);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update step";
    const status = message === "Step not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { taskId, stepId } = await params;
    await deletePlanStep(taskId, stepId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete step";
    const status = message === "Step not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

/** Duplicate a step — POST /steps/[stepId] with { action: "duplicate" } */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { taskId, stepId } = await params;
    const body = await request.json().catch(() => ({}));
    if (body?.action === "duplicate") {
      const step = await duplicatePlanStep(taskId, stepId);
      return NextResponse.json(step, { status: 201 });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to duplicate step";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
