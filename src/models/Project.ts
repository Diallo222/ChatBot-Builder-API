import mongoose, { Document, Schema } from "mongoose";

interface IScrapedPage {
  url: string;
  selected: boolean;
  content?: string;
}

interface ICustomFaq {
  question: string;
  answer: string;
}

interface IAppearance {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: string;
}

export interface IProject extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  websiteUrl?: string;
  scrapedPages: IScrapedPage[];
  avatar?: mongoose.Types.ObjectId;
  customFaqs: ICustomFaq[];
  appearance: IAppearance;
  embedCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    websiteUrl: {
      type: String,
      trim: true,
    },
    scrapedPages: [
      {
        url: {
          type: String,
        },
        selected: {
          type: Boolean,
          default: false,
        },
        content: {
          type: String,
        },
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    avatar: {
      type: Schema.Types.ObjectId,
      ref: "Avatar",
    },
    customFaqs: [
      {
        question: {
          type: String,
        },
        answer: {
          type: String,
        },
      },
    ],
    appearance: {
      primaryColor: {
        type: String,
        default: "#3498db",
      },
      secondaryColor: {
        type: String,
        default: "#2ecc71",
      },
      fontFamily: {
        type: String,
        default: "Arial, sans-serif",
      },
      fontSize: {
        type: String,
        default: "14px",
      },
    },
    embedCode: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProject>("Project", ProjectSchema);
