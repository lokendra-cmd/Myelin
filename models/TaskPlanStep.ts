import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskPlanStepSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "TaskPlan",
      required: true,
      index: true,
    },
    orderIndex: { type: Number, required: true, default: 0, min: 0 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    durationMinutes: { type: Number, default: 0, min: 0, max: 1440 },
    icon: { type: String, default: "Clipboard", trim: true, maxlength: 48 },
    isCompleted: { type: Boolean, default: false },
    isCollapsed: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "task_plan_steps" },
);

TaskPlanStepSchema.index({ userId: 1, planId: 1, orderIndex: 1 });
TaskPlanStepSchema.index({ planId: 1, isCompleted: 1 });

export type TaskPlanStepDocument = InferSchemaType<typeof TaskPlanStepSchema>;

if (mongoose.models.TaskPlanStep) {
  delete (mongoose.models as Record<string, unknown>).TaskPlanStep;
}

export const TaskPlanStep: Model<TaskPlanStepDocument> = mongoose.model(
  "TaskPlanStep",
  TaskPlanStepSchema,
);
