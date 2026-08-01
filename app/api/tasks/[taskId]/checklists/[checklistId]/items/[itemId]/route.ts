import { NextResponse } from "next/server";
import { deleteChecklistItem, updateChecklistItem } from "@/actions/task-plans";
import { serializeChecklistItem } from "@/lib/serializers";

type Ctx = { params: Promise<{ taskId: string; checklistId: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { checklistId, itemId } = await params;
    const body = await request.json();
    const item = await updateChecklistItem(checklistId, itemId, body);
    return NextResponse.json(serializeChecklistItem(item as Record<string, unknown>));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { checklistId, itemId } = await params;
    await deleteChecklistItem(checklistId, itemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
