/**
 * One-time migration: create Lokendra's account and assign all existing
 * documents to that user. Safe to re-run (idempotent upserts / updateMany).
 *
 * Usage: npx tsx migrate_user_isolation.ts
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const OWNER_EMAIL = process.env.MIGRATE_OWNER_EMAIL || "lokendra69.lk@gmail.com";
const OWNER_PASSWORD = process.env.MIGRATE_OWNER_PASSWORD;
const OWNER_NAME = process.env.MIGRATE_OWNER_NAME || "Lokendra";

const COLLECTIONS = [
  "sprints",
  "tasks",
  "categories",
  "rules",
  "braindumpThoughts",
  "task_plans",
  "task_plan_steps",
  "task_checklists",
  "task_checklist_items",
  "task_notes",
  "task_attachments",
] as const;

async function dropIndexIfExists(collection: mongoose.mongo.Collection, name: string) {
  try {
    await collection.dropIndex(name);
    console.log(`  dropped index ${collection.collectionName}.${name}`);
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 27 /* IndexNotFound */) {
      // Ignore missing indexes; log unexpected errors.
      const message = error instanceof Error ? error.message : String(error);
      if (!/index not found/i.test(message)) {
        console.warn(`  skip drop ${collection.collectionName}.${name}: ${message}`);
      }
    }
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  if (!OWNER_PASSWORD) {
    throw new Error("Missing MIGRATE_OWNER_PASSWORD (set it in the environment before running)");
  }

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "sprint" });
  const db = mongoose.connection.db!;

  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12);
  const users = db.collection("users");

  const existing = await users.findOne({ email: OWNER_EMAIL });
  let userId: mongoose.Types.ObjectId;

  if (existing?._id) {
    userId = existing._id as mongoose.Types.ObjectId;
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          name: OWNER_NAME,
          email: OWNER_EMAIL,
          passwordHash,
          updatedAt: new Date(),
        },
      },
    );
    console.log(`✓ Updated user ${OWNER_EMAIL} (${userId})`);
  } else {
    const inserted = await users.insertOne({
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userId = inserted.insertedId;
    console.log(`✓ Created user ${OWNER_EMAIL} (${userId})`);
  }

  for (const name of COLLECTIONS) {
    const collection = db.collection(name);
    const result = await collection.updateMany(
      {
        $or: [{ userId: { $exists: false } }, { userId: null }],
      },
      { $set: { userId } },
    );
    console.log(`✓ ${name}: assigned userId to ${result.modifiedCount} document(s)`);
  }

  // Replace global unique indexes with per-user compound uniques.
  const sprints = db.collection("sprints");
  await dropIndexIfExists(sprints, "date_1");
  await sprints.createIndex({ userId: 1, date: 1 }, { unique: true });
  console.log("✓ sprints: unique { userId, date }");

  const categories = db.collection("categories");
  await dropIndexIfExists(categories, "key_1");
  await categories.createIndex({ userId: 1, key: 1 }, { unique: true });
  console.log("✓ categories: unique { userId, key }");

  await db.collection("tasks").createIndex({ userId: 1, sprintId: 1, category: 1, order: 1 });
  await db.collection("tasks").createIndex({ userId: 1, habitId: 1 });
  await db.collection("rules").createIndex({ userId: 1, order: 1 });
  await db.collection("braindumpThoughts").createIndex({ userId: 1, order: 1 });
  await db.collection("task_plans").createIndex({ userId: 1, taskId: 1 });
  await db.collection("task_plan_steps").createIndex({ userId: 1, planId: 1, orderIndex: 1 });
  await db.collection("task_checklists").createIndex({ userId: 1, taskId: 1, orderIndex: 1 });
  await db.collection("task_checklist_items").createIndex({ userId: 1, checklistId: 1, orderIndex: 1 });
  await db.collection("task_notes").createIndex({ userId: 1, taskId: 1 });
  await db.collection("task_attachments").createIndex({ userId: 1, taskId: 1, createdAt: -1 });
  console.log("✓ supporting userId indexes ensured");

  const unscoped = await Promise.all(
    COLLECTIONS.map(async (name) => ({
      name,
      count: await db.collection(name).countDocuments({
        $or: [{ userId: { $exists: false } }, { userId: null }],
      }),
    })),
  );
  const leftover = unscoped.filter((c) => c.count > 0);
  if (leftover.length) {
    console.warn("⚠ Still unscoped:", leftover);
  } else {
    console.log("✓ All collections have userId set");
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
