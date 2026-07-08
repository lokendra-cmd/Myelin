import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CategorySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true },
    label: { type: String, required: true, trim: true },
    emoji: { type: String, default: "•" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CategoryDocument = InferSchemaType<typeof CategorySchema>;

export const Category: Model<CategoryDocument> =
  mongoose.models.Category || mongoose.model("Category", CategorySchema);
