"use server";

import { revalidatePath as nextRevalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import {
  buildBlocksFromEntries,
  sectionNeedsEntryMigration,
  serializeMentalToolkitSection,
} from "@/lib/mental-toolkit-serializers";
import { requireUserId } from "@/lib/session";
import { MentalToolkitSection } from "@/models/MentalToolkitSection";
import type {
  MentalToolkitBlockType,
  MentalToolkitSectionDTO,
} from "@/types/mental-toolkit";
import { MENTAL_TOOLKIT_BLOCK_TYPES } from "@/types/mental-toolkit";

function revalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch {
    // Suppress invariant error when executing outside request cycle
  }
}

async function getOwnedSection(sectionId: string, userId: string) {
  await connectDB();
  const section = await MentalToolkitSection.findOne({ _id: sectionId, userId });
  if (!section) {
    throw new Error("Section not found");
  }
  return section;
}

async function migrateEntriesToBlocksIfNeeded(section: Awaited<ReturnType<typeof getOwnedSection>>) {
  const plain = section.toObject();
  if (!sectionNeedsEntryMigration(plain)) return section;

  section.blocks.splice(0, section.blocks.length);
  for (const block of buildBlocksFromEntries(plain.entries ?? [])) {
    section.blocks.push(block);
  }
  section.entries.splice(0, section.entries.length);
  await section.save();
  return section;
}

function normalizeBlockOrder(section: Awaited<ReturnType<typeof getOwnedSection>>) {
  section.blocks.forEach((block, index) => {
    block.order = index;
  });
}

export async function getMentalToolkitSections(): Promise<MentalToolkitSectionDTO[]> {
  const userId = await requireUserId();
  await connectDB();
  const docs = await MentalToolkitSection.find({ userId }).sort({ order: 1 });

  await Promise.all(docs.map((doc) => migrateEntriesToBlocksIfNeeded(doc)));

  return docs.map((doc) => serializeMentalToolkitSection(doc.toObject()));
}

export async function createMentalToolkitSection(
  title = "Untitled section",
): Promise<MentalToolkitSectionDTO> {
  const userId = await requireUserId();
  await connectDB();
  const count = await MentalToolkitSection.countDocuments({ userId });
  const doc = await MentalToolkitSection.create({
    userId,
    title: title.trim() || "Untitled section",
    collapsed: false,
    order: count,
    blocks: [{ type: "paragraph", content: "", order: 0 }],
    entries: [],
  });
  revalidatePath("/mental-toolkit");
  return serializeMentalToolkitSection(doc.toObject());
}

export async function updateMentalToolkitSection(
  sectionId: string,
  input: { title?: string; collapsed?: boolean },
): Promise<MentalToolkitSectionDTO> {
  const userId = await requireUserId();
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) {
    payload.title = input.title.trim() || "Untitled section";
  }
  if (input.collapsed !== undefined) {
    payload.collapsed = input.collapsed;
  }
  const doc = await getOwnedSection(sectionId, userId);
  doc.set(payload);
  await doc.save();
  revalidatePath("/mental-toolkit");
  return serializeMentalToolkitSection(doc.toObject());
}

export async function deleteMentalToolkitSection(sectionId: string): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  await connectDB();
  await MentalToolkitSection.findOneAndDelete({ _id: sectionId, userId });
  revalidatePath("/mental-toolkit");
  return { success: true };
}

export async function addMentalToolkitBlock(
  sectionId: string,
  type: MentalToolkitBlockType,
  afterBlockId?: string | null,
): Promise<MentalToolkitSectionDTO> {
  const userId = await requireUserId();
  if (!MENTAL_TOOLKIT_BLOCK_TYPES.includes(type)) {
    throw new Error("Invalid block type");
  }

  const section = await migrateEntriesToBlocksIfNeeded(await getOwnedSection(sectionId, userId));

  if (afterBlockId) {
    const index = section.blocks.findIndex((block) => String(block._id) === afterBlockId);
    if (index >= 0) {
      section.blocks.splice(index + 1, 0, { type, content: "", order: index + 1 });
    } else {
      section.blocks.push({ type, content: "", order: section.blocks.length });
    }
  } else {
    section.blocks.push({ type, content: "", order: section.blocks.length });
  }

  normalizeBlockOrder(section);
  await section.save();
  revalidatePath("/mental-toolkit");
  return serializeMentalToolkitSection(section.toObject());
}

export async function updateMentalToolkitBlock(
  sectionId: string,
  blockId: string,
  input: { content?: string; type?: MentalToolkitBlockType },
): Promise<MentalToolkitSectionDTO> {
  const userId = await requireUserId();
  const section = await migrateEntriesToBlocksIfNeeded(await getOwnedSection(sectionId, userId));
  const block = section.blocks.id(blockId);
  if (!block) {
    throw new Error("Block not found");
  }

  if (input.content !== undefined) {
    block.content = input.content;
  }
  if (input.type !== undefined) {
    if (!MENTAL_TOOLKIT_BLOCK_TYPES.includes(input.type)) {
      throw new Error("Invalid block type");
    }
    block.type = input.type;
  }

  await section.save();
  revalidatePath("/mental-toolkit");
  return serializeMentalToolkitSection(section.toObject());
}

export async function deleteMentalToolkitBlock(
  sectionId: string,
  blockId: string,
): Promise<MentalToolkitSectionDTO> {
  const userId = await requireUserId();
  const section = await migrateEntriesToBlocksIfNeeded(await getOwnedSection(sectionId, userId));

  if (section.blocks.length <= 1) {
    const block = section.blocks.id(blockId);
    if (block) {
      block.content = "";
      block.type = "paragraph";
    }
    await section.save();
    revalidatePath("/mental-toolkit");
    return serializeMentalToolkitSection(section.toObject());
  }

  const block = section.blocks.id(blockId);
  if (!block) {
    throw new Error("Block not found");
  }
  block.deleteOne();
  normalizeBlockOrder(section);
  await section.save();
  revalidatePath("/mental-toolkit");
  return serializeMentalToolkitSection(section.toObject());
}
