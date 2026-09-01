import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const MentalToolkitEntrySchema = new Schema(
  {
    h1: { type: String, default: "", trim: true, maxlength: 500 },
    h2: { type: String, default: "", trim: true, maxlength: 500 },
    bullets: { type: [String], default: [] },
    paragraph: { type: String, default: "", trim: true, maxlength: 10000 },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

/** Legacy — kept so existing documents can be migrated on read. */
const MentalToolkitBlockSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["paragraph", "bullet", "h1", "h2"],
      required: true,
    },
    content: { type: String, default: "", trim: true, maxlength: 10000 },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

const MentalToolkitSectionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Untitled section", trim: true, maxlength: 200 },
    collapsed: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    entries: { type: [MentalToolkitEntrySchema], default: [] },
    blocks: { type: [MentalToolkitBlockSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "mentalToolkitSections",
  },
);

MentalToolkitSectionSchema.index({ userId: 1, order: 1 });

export type MentalToolkitSectionDocument = InferSchemaType<typeof MentalToolkitSectionSchema>;

if (mongoose.models.MentalToolkitSection) {
  delete (mongoose.models as Record<string, unknown>).MentalToolkitSection;
}

export const MentalToolkitSection: Model<MentalToolkitSectionDocument> = mongoose.model(
  "MentalToolkitSection",
  MentalToolkitSectionSchema,
);
