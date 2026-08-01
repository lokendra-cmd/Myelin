import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Task summary document — kept lean for list/dashboard reads.
 * Plan steps, notes, checklists, and attachments live in separate collections.
 */
const TaskSchema = new Schema(
  {
    sprintId: { type: Schema.Types.ObjectId, ref: "Sprint", required: true, index: true },
    title: { type: String, required: true, trim: true },
    /** Short task description shown on the Plan page header. */
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    /**
     * @deprecated Legacy freeform plan text. Migrated into TaskPlan.overview / TaskNote.
     * Kept for backward compatibility during rollout; do not write new data here.
     */
    plan: { type: String, default: "", trim: true },
    category: { type: String, required: true, index: true, trim: true },
    estimatedTimeMinutes: { type: Number, default: null, min: 0, max: 10080 },
    favorite: { type: Boolean, default: false, index: true },
    /** Optional per-task cover; null uses the shared productivity cover. */
    coverImage: { type: String, default: null, trim: true, maxlength: 2000 },
    /**
     * Denormalized counters so the task list can show Plan state
     * without joining task_plan_steps on every list load.
     */
    planStepCount: { type: Number, default: 0, min: 0 },
    planCompletedStepCount: { type: Number, default: 0, min: 0 },
    /** Stable identity for recurring habits across sprints/renames. One-off tasks leave this null. */
    habitId: { type: String, default: null, index: true },
    completed: { type: Boolean, default: false },
    isRecurring: { type: Boolean, default: false },
    recurringDays: { type: [Number], default: [] },
    recurringStartDate: { type: Date, default: null },
    recurringEndDate: { type: Date, default: null },
    untilComplete: { type: Boolean, default: false },
    /** Sticky highlight for recurring habits — carried into new sprint instances. */
    highlighted: { type: Boolean, default: false },
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
    calories: { type: Number, default: null },
    protein: { type: Number, default: null },
    fat: { type: Number, default: null },
    carbs: { type: Number, default: null },
  },
  { timestamps: true },
);

// Matches the common access pattern: fetch a sprint's tasks sorted by
// category then order. Also serves the batched { sprintId: { $in } } loads.
TaskSchema.index({ sprintId: 1, category: 1, order: 1 });
TaskSchema.index({ sprintId: 1, favorite: -1, order: 1 });

export type TaskDocument = InferSchemaType<typeof TaskSchema>;

if (mongoose.models.Task) {
  delete (mongoose.models as Record<string, unknown>).Task;
}

export const Task: Model<TaskDocument> = mongoose.model("Task", TaskSchema);
