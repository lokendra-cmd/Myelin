import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

if (mongoose.models.User) {
  delete (mongoose.models as Record<string, unknown>).User;
}

export const User: Model<UserDocument> = mongoose.model("User", UserSchema);
