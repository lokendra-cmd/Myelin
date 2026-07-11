import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BrainDumpThoughtSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true, trim: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "braindumpThoughts",
  }
);

export type BrainDumpThoughtDocument = InferSchemaType<typeof BrainDumpThoughtSchema>;

if (mongoose.models.BrainDumpThought) {
  delete (mongoose.models as Record<string, unknown>).BrainDumpThought;
}

export const BrainDumpThought: Model<BrainDumpThoughtDocument> = mongoose.model("BrainDumpThought", BrainDumpThoughtSchema);
