import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BrainDumpThoughtSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    /** Optional longer note / context for the thought. */
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    /** Optional external URL related to the thought. */
    link: { type: String, default: "", trim: true, maxlength: 2000 },
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
