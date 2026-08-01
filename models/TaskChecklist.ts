import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskChecklistSchema = new Schema(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    orderIndex: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "task_checklists" },
);

TaskChecklistSchema.index({ taskId: 1, orderIndex: 1 });

export type TaskChecklistDocument = InferSchemaType<typeof TaskChecklistSchema>;

if (mongoose.models.TaskChecklist) {
  delete (mongoose.models as Record<string, unknown>).TaskChecklist;
}

export const TaskChecklist: Model<TaskChecklistDocument> = mongoose.model(
  "TaskChecklist",
  TaskChecklistSchema,
);
