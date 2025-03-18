import mongoose, { Document, Schema } from "mongoose";

export interface IChatSession extends Document {
  project: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  messagesCount: number;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    location?: string;
    device?: string;
    browser?: string;
  };
  status: "active" | "completed" | "abandoned";
}

const ChatSessionSchema: Schema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endedAt: Date,
    duration: Number,
    messagesCount: {
      type: Number,
      default: 0,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metadata: {
      userAgent: String,
      ipAddress: String,
      location: String,
      device: String,
      browser: String,
    },
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);
