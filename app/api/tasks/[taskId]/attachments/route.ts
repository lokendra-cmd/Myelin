import { NextResponse } from "next/server";
import { addTaskAttachment, getTaskAttachments } from "@/actions/task-plans";

type Ctx = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const attachments = await getTaskAttachments(taskId);
    return NextResponse.json(attachments);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load attachments";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const attachment = await addTaskAttachment(taskId, body);
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add attachment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
