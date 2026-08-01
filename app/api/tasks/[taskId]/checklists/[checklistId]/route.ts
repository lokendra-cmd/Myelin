import { NextResponse } from "next/server";
import { deleteChecklist, updateChecklist } from "@/actions/task-plans";

type Ctx = { params: Promise<{ taskId: string; checklistId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { taskId, checklistId } = await params;
    const body = await request.json();
    const checklist = await updateChecklist(taskId, checklistId, body);
    return NextResponse.json(checklist);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update checklist";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { taskId, checklistId } = await params;
    await deleteChecklist(taskId, checklistId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete checklist";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
