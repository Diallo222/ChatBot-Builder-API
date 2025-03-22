import mongoose, { Document, Schema } from "mongoose";

export interface IChatSession extends Document {
  project: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  messagesCount: number;
  threadId: string; // Add OpenAI thread ID
  assistantId: string; // Add OpenAI assistant ID
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    messageId: string; // Add OpenAI message ID
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
    threadId: {
      type: String,
      required: true,
    },
    assistantId: {
      type: String,
      required: true,
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
        messageId: {
          type: String,
          required: true,
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
