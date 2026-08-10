import { NextResponse } from "next/server";
import { addChecklistItem } from "@/actions/task-plans";

type Ctx = { params: Promise<{ taskId: string; checklistId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { checklistId } = await params;
    const body = await request.json();
    const item = await addChecklistItem(checklistId, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
