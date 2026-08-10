import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const RuleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, trim: true },
    icon: { type: String, default: "" },
    themeId: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

RuleSchema.index({ userId: 1, order: 1 });

export type RuleDocument = InferSchemaType<typeof RuleSchema>;

if (mongoose.models.Rule) {
  delete (mongoose.models as Record<string, unknown>).Rule;
}

export const Rule: Model<RuleDocument> = mongoose.model("Rule", RuleSchema);
