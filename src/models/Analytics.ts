import mongoose, { Document, Schema } from "mongoose";

export interface IAnalytics extends Document {
  project: mongoose.Types.ObjectId;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    popularTopics: Array<{
      topic: string;
      count: number;
    }>;
    messageDistribution: {
      user: number;
      assistant: number;
    };
    averageConversationLength: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsSchema: Schema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    metrics: {
      totalConversations: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      averageResponseTime: { type: Number, default: 0 },
      popularTopics: [
        {
          topic: String,
          count: Number,
        },
      ],
      messageDistribution: {
        user: { type: Number, default: 0 },
        assistant: { type: Number, default: 0 },
      },
      averageConversationLength: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAnalytics>("Analytics", AnalyticsSchema);
