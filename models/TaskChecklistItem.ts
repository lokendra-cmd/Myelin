import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskChecklistItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    checklistId: {
      type: Schema.Types.ObjectId,
      ref: "TaskChecklist",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    completed: { type: Boolean, default: false },
    orderIndex: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "task_checklist_items" },
);

TaskChecklistItemSchema.index({ userId: 1, checklistId: 1, orderIndex: 1 });

export type TaskChecklistItemDocument = InferSchemaType<typeof TaskChecklistItemSchema>;

if (mongoose.models.TaskChecklistItem) {
  delete (mongoose.models as Record<string, unknown>).TaskChecklistItem;
}

export const TaskChecklistItem: Model<TaskChecklistItemDocument> = mongoose.model(
  "TaskChecklistItem",
  TaskChecklistItemSchema,
);
