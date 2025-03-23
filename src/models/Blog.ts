import mongoose from "mongoose";

interface IBlog {
  _id?: string;
  title: string;
  description: string;
  content: string;
  keywords: string[];
  imageUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    keywords: [{ type: String }],
    imageUrl: { type: String, required: true },
  },
  { timestamps: true }
);

const Blog = mongoose.model<IBlog>("Blog", blogSchema);

export { Blog, IBlog };
