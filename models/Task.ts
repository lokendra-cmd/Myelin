import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskSchema = new Schema(
  {
    sprintId: { type: Schema.Types.ObjectId, ref: "Sprint", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true, trim: true },
    /** Stable identity for recurring habits across sprints/renames. One-off tasks leave this null. */
    habitId: { type: String, default: null, index: true },
    completed: { type: Boolean, default: false },
    isRecurring: { type: Boolean, default: false },
    recurringDays: { type: [Number], default: [] },
    recurringStartDate: { type: Date, default: null },
    recurringEndDate: { type: Date, default: null },
    untilComplete: { type: Boolean, default: false },
    deadlineAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    history: {
      type: [
        {
          startedAt: { type: Date, required: true },
          completedAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Matches the common access pattern: fetch a sprint's tasks sorted by
// category then order. Also serves the batched { sprintId: { $in } } loads.
TaskSchema.index({ sprintId: 1, category: 1, order: 1 });

export type TaskDocument = InferSchemaType<typeof TaskSchema>;

if (mongoose.models.Task) {
  delete (mongoose.models as Record<string, unknown>).Task;
}

export const Task: Model<TaskDocument> = mongoose.model("Task", TaskSchema);
