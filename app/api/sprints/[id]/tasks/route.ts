import { NextResponse } from "next/server";
import { updateTask } from "@/actions/sprints";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { taskId, ...body } = await request.json();
  const sprint = await updateTask(id, taskId, body);
  return NextResponse.json(sprint);
}
