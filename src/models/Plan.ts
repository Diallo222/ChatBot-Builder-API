import mongoose, { Document, Schema } from "mongoose";

export interface IPlan extends Document {
  name: string;
  description: string;
  price: number;
  avatarLimit: number;
  features: string[];
  stripeProductId?: string;
  stripePriceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: {
      type: String,
      required: [true, "Please add a plan name"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
    },
    avatarLimit: {
      type: Number,
      required: [true, "Please specify avatar limit"],
    },
    features: {
      type: [String],
      required: [true, "Please add features"],
    },
    stripeProductId: {
      type: String,
    },
    stripePriceId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPlan>("Plan", PlanSchema);
