import { NextResponse } from "next/server";
import { createCategory, getCategories } from "@/actions/sprints";

export async function GET() {
  return NextResponse.json(await getCategories());
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(await createCategory(body));
}
