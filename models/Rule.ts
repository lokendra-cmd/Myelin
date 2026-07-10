import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const RuleSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    icon: { type: String, default: "" },
    themeId: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type RuleDocument = InferSchemaType<typeof RuleSchema>;

if (mongoose.models.Rule) {
  delete (mongoose.models as any).Rule;
}

export const Rule: Model<RuleDocument> = mongoose.model("Rule", RuleSchema);
