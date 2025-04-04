import mongoose, { Document, Schema } from "mongoose";

interface IExpertPrompt extends Document {
  title: string;
  prompt: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expertPromptSchema = new Schema<IExpertPrompt>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const ExpertPrompt = mongoose.model<IExpertPrompt>(
  "ExpertPrompt",
  expertPromptSchema
);

export default ExpertPrompt;
