import { NextResponse } from "next/server";
import { addChecklist, getTaskChecklists } from "@/actions/task-plans";

type Ctx = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const checklists = await getTaskChecklists(taskId);
    return NextResponse.json(checklists);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load checklists";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const checklist = await addChecklist(taskId, body);
    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add checklist";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
