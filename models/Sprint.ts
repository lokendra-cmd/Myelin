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
    date: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    completedTasks: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    productivity: { type: Number, default: 0 },
    reflection: { type: ReflectionSchema, default: {} },
    highlightTaskIds: [{ type: Schema.Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true },
);

export type SprintDocument = InferSchemaType<typeof SprintSchema>;

export const Sprint: Model<SprintDocument> =
  mongoose.models.Sprint || mongoose.model("Sprint", SprintSchema);
