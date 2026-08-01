import { NextResponse } from "next/server";
import { createCategory, getCategories, reorderCategories } from "@/actions/sprints";

export async function GET() {
  return NextResponse.json(await getCategories());
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(await createCategory(body));
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await reorderCategories(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder categories";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
