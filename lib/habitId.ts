import { randomUUID } from "crypto";
import { Task } from "@/models/Task";

export function newHabitId(): string {
  return randomUUID();
}

/** Backfill habitId on recurring tasks so renames don't break history. Groups by category+title when missing. */
export async function ensureRecurringHabitIds(userId: string): Promise<void> {
  const missing = await Task.find({
    userId,
    isRecurring: true,
    $or: [{ habitId: null }, { habitId: { $exists: false } }, { habitId: "" }],
  })
    .select({ _id: 1, title: 1, category: 1 })
    .lean();

  if (missing.length === 0) return;

  const byKey = new Map<string, string[]>();
  for (const task of missing) {
    const key = `${String(task.category)}::${String(task.title ?? "").trim().toLowerCase()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(String(task._id));
    else byKey.set(key, [String(task._id)]);
  }

  await Promise.all(
    Array.from(byKey.values()).map(async (ids) => {
      const habitId = newHabitId();
      await Task.updateMany({ _id: { $in: ids }, userId }, { $set: { habitId } });
    }),
  );
}
