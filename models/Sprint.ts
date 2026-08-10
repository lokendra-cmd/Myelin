import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ReflectionSchema = new Schema(
  {
    wentWell: { type: String, default: "" },
    distracted: { type: String, default: "" },
    improve: { type: String, default: "" },
  },
  { _id: false },
);

const SprintSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    completedTasks: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    productivity: { type: Number, default: 0 },
    reflection: { type: ReflectionSchema, default: {} },
    highlightTaskIds: [{ type: Schema.Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true },
);

SprintSchema.index({ userId: 1, date: 1 }, { unique: true });

export type SprintDocument = InferSchemaType<typeof SprintSchema>;

if (mongoose.models.Sprint) {
  delete (mongoose.models as Record<string, unknown>).Sprint;
}

export const Sprint: Model<SprintDocument> = mongoose.model("Sprint", SprintSchema);
