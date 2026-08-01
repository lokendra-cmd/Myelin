import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * One plan document per task. Kept separate so Task list documents remain lean.
 */
const TaskPlanSchema = new Schema(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      unique: true,
      index: true,
    },
    /** Optional summary; also receives legacy freeform task.plan on first open. */
    overview: { type: String, default: "", trim: true, maxlength: 2000 },
    estimatedTimeMinutes: { type: Number, default: null, min: 0, max: 10080 },
  },
  { timestamps: true, collection: "task_plans" },
);

export type TaskPlanDocument = InferSchemaType<typeof TaskPlanSchema>;

if (mongoose.models.TaskPlan) {
  delete (mongoose.models as Record<string, unknown>).TaskPlan;
}

export const TaskPlan: Model<TaskPlanDocument> = mongoose.model("TaskPlan", TaskPlanSchema);
