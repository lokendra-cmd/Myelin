import { NextResponse } from "next/server";
import { createSprint } from "@/actions/sprints";
import { isoDate } from "@/utils/date";
import { getServerTimeZone } from "@/utils/dateServer";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const tz = await getServerTimeZone();
  const sprint = await createSprint(body.date ?? isoDate(undefined, tz));
  return NextResponse.json(sprint);
}
