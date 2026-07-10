import { NextResponse } from "next/server";
import { createRule, getRules } from "@/actions/sprints";

export async function GET() {
  return NextResponse.json(await getRules());
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(await createRule(body));
}
