import { NextResponse } from "next/server";
import { searchSprints } from "@/actions/sprints";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json(await searchSprints(searchParams.get("q") ?? ""));
}
