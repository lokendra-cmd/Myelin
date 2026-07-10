export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKENDS = [0, 6];

export type RecurringPreset = "every-day" | "weekdays" | "weekends" | "custom";

export function getPresetFromDays(days: number[]): RecurringPreset {
  const sorted = [...days].sort((a, b) => a - b);
  
  if (sorted.length === 7 && sorted.every((d, i) => d === EVERY_DAY[i])) {
    return "every-day";
  }
  if (sorted.length === 5 && sorted.every((d, i) => d === WEEKDAYS[i])) {
    return "weekdays";
  }
  if (sorted.length === 2 && sorted.every((d, i) => d === WEEKENDS[i])) {
    return "weekends";
  }
  return "custom";
}

export function getDaysFromPreset(preset: RecurringPreset): number[] {
  switch (preset) {
    case "every-day":
      return [...EVERY_DAY];
    case "weekdays":
      return [...WEEKDAYS];
    case "weekends":
      return [...WEEKENDS];
    default:
      return [];
  }
}
