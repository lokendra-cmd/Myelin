import { NextResponse } from "next/server";
import { addPlanStep, reorderPlanSteps } from "@/actions/task-plans";

type Ctx = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const step = await addPlanStep(taskId, body);
    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add step";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const steps = await reorderPlanSteps(taskId, body);
    return NextResponse.json(steps);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder steps";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
