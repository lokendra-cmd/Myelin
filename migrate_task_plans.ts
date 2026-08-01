/**
 * One-time migration: ensure compound indexes for plan collections exist.
 * Mongoose also creates these on first use via schema.index(); this script
 * is safe to re-run (createIndex is idempotent).
 *
 * Usage: npx tsx migrate_task_plans.ts
 */
import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "sprint" });
  const db = mongoose.connection.db!;

  const ops: Array<{ collection: string; keys: Record<string, 1 | -1>; options?: object }> = [
    { collection: "task_plans", keys: { taskId: 1 }, options: { unique: true } },
    { collection: "task_plan_steps", keys: { planId: 1, orderIndex: 1 } },
    { collection: "task_plan_steps", keys: { planId: 1, isCompleted: 1 } },
    { collection: "task_checklists", keys: { taskId: 1, orderIndex: 1 } },
    { collection: "task_checklist_items", keys: { checklistId: 1, orderIndex: 1 } },
    { collection: "task_notes", keys: { taskId: 1 }, options: { unique: true } },
    { collection: "task_attachments", keys: { taskId: 1, createdAt: -1 } },
    { collection: "tasks", keys: { sprintId: 1, favorite: -1, order: 1 } },
  ];

  for (const op of ops) {
    const result = await db.collection(op.collection).createIndex(op.keys, op.options ?? {});
    console.log(`✓ ${op.collection}: ${result}`);
  }

  // Backfill denormalized counters for tasks that already have plans (no-op if empty).
  const plans = await db.collection("task_plans").find({}).project({ _id: 1, taskId: 1 }).toArray();
  for (const plan of plans) {
    const [total, done] = await Promise.all([
      db.collection("task_plan_steps").countDocuments({ planId: plan._id }),
      db.collection("task_plan_steps").countDocuments({ planId: plan._id, isCompleted: true }),
    ]);
    await db.collection("tasks").updateOne(
      { _id: plan.taskId },
      { $set: { planStepCount: total, planCompletedStepCount: done } },
    );
  }
  console.log(`✓ Synced counters for ${plans.length} plan(s)`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
