import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Notes tab document — one per task, lazy-loaded separately from the Plan page.
 * Keeps large text out of Task and TaskPlan hot paths.
 */
const TaskNoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      unique: true,
      index: true,
    },
    content: { type: String, default: "", maxlength: 50000 },
  },
  { timestamps: true, collection: "task_notes" },
);

TaskNoteSchema.index({ userId: 1, taskId: 1 });

export type TaskNoteDocument = InferSchemaType<typeof TaskNoteSchema>;

if (mongoose.models.TaskNote) {
  delete (mongoose.models as Record<string, unknown>).TaskNote;
}

export const TaskNote: Model<TaskNoteDocument> = mongoose.model("TaskNote", TaskNoteSchema);
