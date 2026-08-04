import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CategorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    emoji: { type: String, default: "•" },
    tagline: { type: String, default: "" },
    themeId: { type: String, default: "" },
    icon: { type: String, default: "" },
    isBrainDump: { type: Boolean, default: false },
    isCaloriesTracker: { type: Boolean, default: false },
    targetCalories: { type: Number, default: null },
    targetProtein: { type: Number, default: null },
    targetFat: { type: Number, default: null },
    targetCarbs: { type: Number, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

CategorySchema.index({ userId: 1, key: 1 }, { unique: true });
CategorySchema.index({ userId: 1, order: 1 });

export type CategoryDocument = InferSchemaType<typeof CategorySchema>;

if (mongoose.models.Category) {
  delete (mongoose.models as Record<string, unknown>).Category;
}

export const Category: Model<CategoryDocument> = mongoose.model("Category", CategorySchema);
