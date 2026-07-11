import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CategorySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true },
    label: { type: String, required: true, trim: true },
    emoji: { type: String, default: "•" },
    tagline: { type: String, default: "" },
    themeId: { type: String, default: "" },
    icon: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CategoryDocument = InferSchemaType<typeof CategorySchema>;

if (mongoose.models.Category) {
  delete (mongoose.models as Record<string, unknown>).Category;
}

export const Category: Model<CategoryDocument> = mongoose.model("Category", CategorySchema);
