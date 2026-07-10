import { NextResponse } from "next/server";
import { deleteRule, updateRule } from "@/actions/sprints";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  return NextResponse.json(await updateRule(id, body));
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  return NextResponse.json(await deleteRule(id));
}
