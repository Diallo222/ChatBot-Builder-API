import mongoose, { Document, Schema } from "mongoose";

export interface IMessage {
  sender: "user" | "bot";
  content: string;
  timestamp: Date;
}

export interface IConversation extends Document {
  project: mongoose.Types.ObjectId;
  visitor: {
    id?: string;
    ip?: string;
    userAgent?: string;
  };
  messages: IMessage[];
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    visitor: {
      id: { type: String },
      ip: { type: String },
      userAgent: { type: String },
    },
    messages: [
      {
        sender: { type: String, enum: ["user", "bot"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema
);
