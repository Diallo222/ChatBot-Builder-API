import mongoose, { Schema, Document } from "mongoose";

export interface IDocument extends Document {
  type: "privacy-policy" | "terms-conditions";
  content: string;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ["privacy-policy", "terms-conditions"],
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDocument>("Document", DocumentSchema);
