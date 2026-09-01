export type MentalToolkitBlockType = "paragraph" | "bullet" | "h1" | "h2";

export type MentalToolkitBlockDTO = {
  _id: string;
  type: MentalToolkitBlockType;
  content: string;
  order: number;
};

export type MentalToolkitSectionDTO = {
  _id: string;
  title: string;
  collapsed: boolean;
  order: number;
  blocks: MentalToolkitBlockDTO[];
  createdAt: string;
  updatedAt: string;
};

export const MENTAL_TOOLKIT_BLOCK_TYPES: MentalToolkitBlockType[] = [
  "paragraph",
  "bullet",
  "h1",
  "h2",
];
