import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskAttachmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true, trim: true, maxlength: 260 },
    storageUrl: { type: String, required: true, trim: true, maxlength: 2000 },
    mimeType: { type: String, default: "application/octet-stream", trim: true, maxlength: 120 },
    size: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "task_attachments" },
);

TaskAttachmentSchema.index({ userId: 1, taskId: 1, createdAt: -1 });

export type TaskAttachmentDocument = InferSchemaType<typeof TaskAttachmentSchema>;

if (mongoose.models.TaskAttachment) {
  delete (mongoose.models as Record<string, unknown>).TaskAttachment;
}

export const TaskAttachment: Model<TaskAttachmentDocument> = mongoose.model(
  "TaskAttachment",
  TaskAttachmentSchema,
);
