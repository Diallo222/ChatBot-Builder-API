import { Request, Response } from "express";
import ExpertPrompt from "../models/ExpertPrompt";
import { deleteFromStorage } from "../services/storageService";

// Get all expert prompts (admin only)
export const getAllExpertPrompts = async (req: Request, res: Response) => {
  try {
    const expertPrompts = await ExpertPrompt.find({});
    return res.status(200).json({ expertPrompts });
  } catch (error) {
    console.error("Error fetching expert prompts:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get a specific expert prompt by ID (admin only)
export const getExpertPrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const expertPrompt = await ExpertPrompt.findById(id);

    if (!expertPrompt) {
      return res.status(404).json({ message: "Expert prompt not found" });
    }

    return res.status(200).json({ expertPrompt });
  } catch (error) {
    console.error("Error fetching expert prompt:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create a new expert prompt (admin only)
export const createExpertPrompt = async (req: Request, res: Response) => {
  try {
    const { title, prompt } = req.body;

    // Check for required fields
    if (!title || !prompt) {
      return res.status(400).json({ message: "Title and prompt are required" });
    }

    // Handle image if uploaded
    const imageUrl = req.file ? req.file.path : null;

    const newExpertPrompt = new ExpertPrompt({
      title,
      prompt,
      imageUrl,
    });

    await newExpertPrompt.save();

    return res.status(201).json({
      message: "Expert prompt created successfully",
      expertPrompt: newExpertPrompt,
    });
  } catch (error) {
    console.error("Error creating expert prompt:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update an existing expert prompt (admin only)
export const updateExpertPrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, prompt } = req.body;

    const expertPrompt = await ExpertPrompt.findById(id);

    if (!expertPrompt) {
      return res.status(404).json({ message: "Expert prompt not found" });
    }

    // Update fields if provided
    if (title) expertPrompt.title = title;
    if (prompt) expertPrompt.prompt = prompt;

    // Update image if a new one is uploaded
    if (req.file) {
      // Delete old image if it exists
      if (expertPrompt.imageUrl) {
        await deleteFromStorage(expertPrompt.imageUrl);
      }
      expertPrompt.imageUrl = req.file.path;
    }

    await expertPrompt.save();

    return res.status(200).json({
      message: "Expert prompt updated successfully",
      expertPrompt,
    });
  } catch (error) {
    console.error("Error updating expert prompt:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete an expert prompt (admin only)
export const deleteExpertPrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const expertPrompt = await ExpertPrompt.findById(id);

    if (!expertPrompt) {
      return res.status(404).json({ message: "Expert prompt not found" });
    }

    // Delete old image if it exists
    if (expertPrompt.imageUrl) {
      await deleteFromStorage(expertPrompt.imageUrl);
    }

    await ExpertPrompt.findByIdAndDelete(id);

    return res
      .status(200)
      .json({ message: "Expert prompt deleted successfully" });
  } catch (error) {
    console.error("Error deleting expert prompt:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all expert prompts (public endpoint)
export const getPublicExpertPrompts = async (req: Request, res: Response) => {
  try {
    const expertPrompts = await ExpertPrompt.find(
      {},
      { title: 1, imageUrl: 1, prompt: 1 }
    );
    return res.status(200).json({ expertPrompts });
  } catch (error) {
    console.error("Error fetching public expert prompts:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
