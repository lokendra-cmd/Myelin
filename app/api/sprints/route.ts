import { NextResponse } from "next/server";
import { createSprint } from "@/actions/sprints";
import { isoDate } from "@/utils/date";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sprint = await createSprint(body.date ?? isoDate());
  return NextResponse.json(sprint);
}
