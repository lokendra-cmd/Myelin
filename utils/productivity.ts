export function calculateProductivity(completed: number, total: number) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

export function productivityMood(productivity: number) {
  if (productivity >= 95) return { emoji: "😎", label: "Legendary" };
  if (productivity >= 85) return { emoji: "😄", label: "Excellent" };
  if (productivity >= 70) return { emoji: "🙂", label: "Nice" };
  if (productivity >= 50) return { emoji: "😐", label: "Keep Going" };
  return { emoji: "😔", label: "Your future self deserves better." };
}
