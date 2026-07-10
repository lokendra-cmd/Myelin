import { THEMES, type CategoryTheme } from "./themes";

/**
 * Deterministically selects a theme from the curated palette using a string ID.
 * Same ID always -> same theme.
 */
export function hashTheme(id: string): CategoryTheme {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return THEMES[hash % THEMES.length];
}

/**
 * Look up theme by ID, falling back to the first theme.
 */
export function getThemeById(id?: string): CategoryTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
