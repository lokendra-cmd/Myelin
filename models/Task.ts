import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskSchema = new Schema(
  {
    sprintId: { type: Schema.Types.ObjectId, ref: "Sprint", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true, trim: true },
    completed: { type: Boolean, default: false },
    isRecurring: { type: Boolean, default: false },
    deadlineAt: { type: Date, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type TaskDocument = InferSchemaType<typeof TaskSchema>;

export const Task: Model<TaskDocument> =
  mongoose.models.Task || mongoose.model("Task", TaskSchema);
