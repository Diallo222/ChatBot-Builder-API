import mongoose, { Schema, Document } from "mongoose";

export interface ITicket extends Document {
  user: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  attachments: Array<{
    filename: string;
    path: string;
    mimetype: string;
  }>;
  status: "in progress" | "resolved";
  supportResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    attachments: [
      {
        filename: String,
        path: String,
        mimetype: String,
      },
    ],
    status: {
      type: String,
      enum: ["in progress", "resolved"],
      default: "in progress",
    },
    supportResponse: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ITicket>("Ticket", TicketSchema);
