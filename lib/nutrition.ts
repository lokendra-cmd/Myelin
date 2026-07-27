import type { TaskDTO } from "@/types/sprint";

export type NutritionTotals = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export function sumNutrition(tasks: TaskDTO[]): NutritionTotals {
  return tasks.reduce(
    (acc, task) => ({
      calories: acc.calories + (task.calories ?? 0),
      protein: acc.protein + (task.protein ?? 0),
      fat: acc.fat + (task.fat ?? 0),
      carbs: acc.carbs + (task.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

/** Macro-derived kcal: protein & carbs = 4 kcal/g, fat = 9 kcal/g */
export function macroCalories({ protein, fat, carbs }: NutritionTotals): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

export function hasMacroData(totals: NutritionTotals): boolean {
  return totals.protein > 0 || totals.fat > 0 || totals.carbs > 0;
}

export function formatKcal(value: number): string {
  return value.toLocaleString();
}
