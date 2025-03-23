import { Request, Response } from "express";
import { Blog, IBlog } from "../models/Blog";

const blogController = {
  // Admin Controllers
  createBlog: async (req: Request, res: Response) => {
    try {
      const blogData: IBlog = req.body;

      // Add image URL from Cloudinary if an image was uploaded
      if (req.file) {
        blogData.imageUrl = req.file.path;
      }

      const newBlog = await Blog.create(blogData);
      return res.status(201).json(newBlog);
    } catch (error) {
      return res.status(500).json({ error: "Failed to create blog" });
    }
  },

  updateBlog: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData: Partial<IBlog> = req.body;

      // Add image URL from Cloudinary if a new image was uploaded
      if (req.file) {
        updateData.imageUrl = req.file.path;
      }

      const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      if (!updatedBlog) {
        return res.status(404).json({ error: "Blog not found" });
      }

      return res.status(200).json(updatedBlog);
    } catch (error) {
      return res.status(500).json({ error: "Failed to update blog" });
    }
  },

  deleteBlog: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedBlog = await Blog.findByIdAndDelete(id);

      if (!deletedBlog) {
        return res.status(404).json({ error: "Blog not found" });
      }

      return res.status(200).json({ message: "Blog deleted successfully" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete blog" });
    }
  },

  // Public Controllers
  getAllBlogs: async (_req: Request, res: Response) => {
    console.log("getAllBlogs");
    try {
      const blogs = await Blog.find().sort({ createdAt: -1 });
      return res.status(200).json(blogs);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch blogs" });
    }
  },

  getBlogById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const blog = await Blog.findById(id);

      if (!blog) {
        return res.status(404).json({ error: "Blog not found" });
      }

      return res.status(200).json(blog);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch blog" });
    }
  },
};

export default blogController;
