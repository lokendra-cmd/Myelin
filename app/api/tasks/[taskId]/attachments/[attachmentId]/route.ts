import { NextResponse } from "next/server";
import { deleteTaskAttachment } from "@/actions/task-plans";

type Ctx = { params: Promise<{ taskId: string; attachmentId: string }> };

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { taskId, attachmentId } = await params;
    await deleteTaskAttachment(taskId, attachmentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete attachment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
