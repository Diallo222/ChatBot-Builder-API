import mongoose, { Schema, Document } from "mongoose";

export interface ITutorial extends Document {
  title: string;
  description: string;
  videoUrl: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

const TutorialSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITutorial>("Tutorial", TutorialSchema);
