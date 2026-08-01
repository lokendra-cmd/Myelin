import { NextResponse } from "next/server";
import { getTaskNote, updateTaskNote } from "@/actions/task-plans";

type Ctx = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const note = await getTaskNote(taskId);
    return NextResponse.json(note);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const note = await updateTaskNote(taskId, body);
    return NextResponse.json(note);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
