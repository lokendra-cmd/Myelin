import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskSchema = new Schema(
  {
    sprintId: { type: Schema.Types.ObjectId, ref: "Sprint", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true, trim: true },
    completed: { type: Boolean, default: false },
    isRecurring: { type: Boolean, default: false },
    deadlineAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type TaskDocument = InferSchemaType<typeof TaskSchema>;

if (mongoose.models.Task) {
  delete (mongoose.models as any).Task;
}

export const Task: Model<TaskDocument> = mongoose.model("Task", TaskSchema);
