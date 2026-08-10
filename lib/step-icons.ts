import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { CircleDot } from "lucide-react";

/** Resolve any Lucide icon name (matches IconPicker / DynamicIcon). */
export function getStepIcon(name?: string | null): LucideIcon {
  if (!name) return CircleDot;
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return Icon ?? CircleDot;
}
