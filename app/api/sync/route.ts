import { NextResponse } from "next/server";
import { getDashboardData } from "@/actions/sprints";

export async function GET() {
  return NextResponse.json(await getDashboardData());
}
