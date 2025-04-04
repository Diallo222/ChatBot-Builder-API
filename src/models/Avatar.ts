import mongoose, { Document, Schema } from "mongoose";

export enum AvatarType {
  PREDEFINED = "predefined",
  CUSTOM = "custom",
  AI_GENERATED = "ai_generated",
}

export interface IAvatar extends Document {
  name: string;
  type: AvatarType;
  imageUrl: string;
  prompt: string;
  owner?: mongoose.Types.ObjectId;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AvatarSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(AvatarType),
      default: AvatarType.PREDEFINED,
    },
    prompt: { type: String },
    imageUrl: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IAvatar>("Avatar", AvatarSchema);
