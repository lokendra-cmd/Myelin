import { NextResponse } from "next/server";
import { deleteCategory, updateCategory } from "@/actions/sprints";

type Ctx = { params: Promise<{ key: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { key } = await params;
  const body = await request.json();
  return NextResponse.json(await updateCategory(decodeURIComponent(key), body));
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { key } = await params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(await deleteCategory(decodeURIComponent(key), body.sprintId));
}
