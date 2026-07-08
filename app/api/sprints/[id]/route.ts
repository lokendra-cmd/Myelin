import { NextResponse } from "next/server";
import { addTask, deleteTask, getSprint, reorderTasks, updateSprint } from "@/actions/sprints";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const sprint = await getSprint(id);
  return sprint ? NextResponse.json(sprint) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const sprint = await updateSprint(id, body);
  return NextResponse.json(sprint);
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const sprint = await addTask(id, body);
  return NextResponse.json(sprint);
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const sprint = await reorderTasks(id, body);
  return NextResponse.json(sprint);
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { taskId } = await request.json();
  const sprint = await deleteTask(id, taskId);
  return NextResponse.json(sprint);
}

export async function OPTIONS() {
  return NextResponse.json({});
}
