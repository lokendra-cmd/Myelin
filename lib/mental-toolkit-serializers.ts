import type { MentalToolkitBlockDTO, MentalToolkitBlockType, MentalToolkitSectionDTO } from "@/types/mental-toolkit";

type LeanBlock = {
  _id?: unknown;
  type?: unknown;
  content?: unknown;
  order?: unknown;
};

type LeanEntry = {
  h1?: unknown;
  h2?: unknown;
  bullets?: unknown;
  paragraph?: unknown;
  order?: unknown;
};

type LeanSection = {
  _id: unknown;
  title?: unknown;
  collapsed?: unknown;
  order?: unknown;
  blocks?: LeanBlock[];
  entries?: LeanEntry[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

function serializeBlock(block: LeanBlock, index: number): MentalToolkitBlockDTO {
  return {
    _id: String(block._id),
    type: block.type as MentalToolkitBlockType,
    content: String(block.content ?? ""),
    order: Number(block.order ?? index),
  };
}

export function buildBlocksFromEntries(entries: LeanEntry[]): Omit<MentalToolkitBlockDTO, "_id">[] {
  const blocks: Omit<MentalToolkitBlockDTO, "_id">[] = [];
  const sorted = [...entries].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

  for (const entry of sorted) {
    const h1 = String(entry.h1 ?? "").trim();
    const h2 = String(entry.h2 ?? "").trim();
    const paragraph = String(entry.paragraph ?? "").trim();
    const bullets = Array.isArray(entry.bullets)
      ? entry.bullets.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];

    if (h1) blocks.push({ type: "h1", content: h1, order: blocks.length });
    if (h2) blocks.push({ type: "h2", content: h2, order: blocks.length });
    for (const bullet of bullets) {
      blocks.push({ type: "bullet", content: bullet, order: blocks.length });
    }
    if (paragraph) blocks.push({ type: "paragraph", content: paragraph, order: blocks.length });
  }

  return blocks;
}

export function sectionNeedsEntryMigration(section: LeanSection) {
  const hasBlocks = Array.isArray(section.blocks) && section.blocks.length > 0;
  const hasEntries = Array.isArray(section.entries) && section.entries.length > 0;
  return !hasBlocks && hasEntries;
}

export function serializeMentalToolkitSection(section: LeanSection): MentalToolkitSectionDTO {
  let blocks = Array.isArray(section.blocks)
    ? section.blocks.map(serializeBlock).sort((a, b) => a.order - b.order)
    : [];

  if (blocks.length === 0 && Array.isArray(section.entries) && section.entries.length > 0) {
    blocks = buildBlocksFromEntries(section.entries).map((block, index) => ({
      ...block,
      _id: `entry-migrated-${index}`,
    }));
  }

  return {
    _id: String(section._id),
    title: String(section.title ?? "Untitled section"),
    collapsed: Boolean(section.collapsed),
    order: Number(section.order ?? 0),
    blocks,
    createdAt: new Date(section.createdAt as string | Date).toISOString(),
    updatedAt: new Date(section.updatedAt as string | Date).toISOString(),
  };
}
