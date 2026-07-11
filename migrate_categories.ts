import mongoose from "mongoose";
import { connectDB } from "./lib/db";
import { Category } from "./models/Category";

async function migrate() {
  await connectDB();
  console.log("Connected to MongoDB.");

  const total = await Category.countDocuments();
  console.log(`Total categories: ${total}`);

  const sample = await Category.findOne();
  console.log("Sample:", sample);

  const result = await Category.collection.updateMany(
    { isBrainDump: { $exists: false } },
    { $set: { isBrainDump: false } }
  );

  console.log(`Updated ${result.modifiedCount} categories to have isBrainDump: false`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
