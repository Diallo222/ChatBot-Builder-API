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

export enum LauncherIcon {
  CHAT = "chat",
  MESSAGE = "message",
  HELP = "help",
  SUPPORT = "support",
  ROBOT = "robot",
  ASSISTANT = "assistant",
  BUBBLE = "bubble",
  CUSTOM = "custom", // If they want to use their own icon
}

export interface IAppearance {
  mainColor: string;
  launcherIcon: LauncherIcon;
  customIconUrl?: string; // Only used when launcherIcon is CUSTOM
}

export interface IConfiguration {
  welcomeMessage: string;
  sampleQuestions: string[];
  appearance: IAppearance;
}

export interface IProject extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  websiteUrl?: string;
  scrapedPages: IScrapedPage[];
  avatar: {
    type: "custom" | "predefined" | "ai_generated";
    imageUrl: string;
    avatarId?: mongoose.Types.ObjectId; // Reference to the Avatar collection
  };
  customFaqs: ICustomFaq[];
  appearance: IAppearance;
  embedCode?: string;
  training: {
    status: "pending" | "processing" | "completed" | "failed";
    lastTrainedAt?: Date;
    error?: string;
  };
  configuration: IConfiguration;
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
      type: {
        type: String,
        enum: ["custom", "predefined", "ai_generated"],
        required: true,
        default: "predefined",
      },
      imageUrl: {
        type: String,
        required: true,
        default: "default-avatar-url", // Replace with your default avatar URL
      },
      avatarId: {
        type: Schema.Types.ObjectId,
        ref: "Avatar",
      },
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
      mainColor: {
        type: String,
        default: "#3498db",
        validate: {
          validator: (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value),
          message: "Main color must be a valid hex color code",
        },
      },
      launcherIcon: {
        type: String,
        enum: Object.values(LauncherIcon),
        default: LauncherIcon.CHAT,
      },
      customIconUrl: {
        type: String,
        validate: {
          validator: function (this: IProject, value: string | undefined) {
            return (
              !value ||
              this.configuration.appearance.launcherIcon !== LauncherIcon.CUSTOM
            );
          },
          message:
            "Custom icon URL is only allowed when launcher icon is set to CUSTOM",
        },
      },
    },
    embedCode: {
      type: String,
    },
    training: {
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
      },
      lastTrainedAt: { type: Date },
      error: { type: String },
    },
    configuration: {
      welcomeMessage: {
        type: String,
        default: "Hello! How can I help you today?",
      },
      sampleQuestions: [
        {
          type: String,
          default: [
            "What services do you offer?",
            "How can I contact support?",
            "What are your business hours?",
          ],
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProject>("Project", ProjectSchema);
