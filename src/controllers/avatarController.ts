import { Request, Response } from "express";
import Avatar, { AvatarType } from "../models/Avatar";
import { uploadToStorage, deleteFromStorage } from "../services/storageService";
import { generateAIAvatar } from "../services/aiAvatarService";

export const createAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, type, prompt } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "No image file provided" });
      return;
    }

    // Upload image to storage
    const imageUrl = await uploadToStorage(file);

    const avatar = await Avatar.create({
      name,
      type: type || AvatarType.CUSTOM,
      imageUrl,
      owner: req.user!.id,
      isPublic: false,
      prompt,
    });

    res.status(201).json(avatar);
  } catch (error) {
    console.error("Create avatar error:", error);
    res.status(500).json({
      message: "Error creating avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Admin endpoints
export const createPublicAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, prompt } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "No image file provided" });
      return;
    }

    const imageUrl = await uploadToStorage(file);

    const avatar = await Avatar.create({
      name,
      type: AvatarType.PREDEFINED,
      imageUrl,
      prompt,
      isPublic: true,
    });

    res.status(201).json(avatar);
  } catch (error) {
    console.error("Create public avatar error:", error);
    res.status(500).json({
      message: "Error creating public avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
export const getAvatars = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get both public avatars and user's custom avatars
    const avatars = await Avatar.find({
      $or: [{ isPublic: true }, { owner: req.user!.id }],
    }).sort({ createdAt: -1 });

    res.status(200).json(avatars);
  } catch (error) {
    console.error("Get avatars error:", error);
    res.status(500).json({
      message: "Error fetching avatars",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getPublicAvatars = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const avatars = await Avatar.find({ isPublic: true }).sort({
      createdAt: -1,
    });
    res.status(200).json(avatars);
  } catch (error) {
    console.error("Get public avatars error:", error);
    res.status(500).json({
      message: "Error fetching public avatars",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name = "", prompt = "" } = req.body;
    const referenceImage = req.file;

    const avatar = await Avatar.findOne({
      _id: id,
      // owner: req.user!.id, // Ensure user owns the avatar
    });

    if (!avatar) {
      res.status(404).json({ message: "Avatar not found" });
      return;
    }

    // Update name if provided
    if (name.trim()) {
      avatar.name = name.trim();
    }

    // Generate new AI avatar if prompt or reference image is provided
    if (prompt.trim() || referenceImage) {
      // Delete old image if it exists
      await deleteFromStorage(avatar.imageUrl);

      // Generate new avatar
      const imageUrl = await generateAIAvatar({
        prompt: prompt.trim() || avatar.prompt, // Use existing prompt if new one not provided
        referenceImage,
      });

      avatar.imageUrl = imageUrl;
      if (prompt.trim()) {
        avatar.prompt = prompt.trim();
      }
    }

    const updatedAvatar = await avatar.save();
    res.json(updatedAvatar);
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({
      message: "Error updating avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const avatar = await Avatar.findOne({
      _id: req.params.id,
      owner: req.user!.id,
    });

    if (!avatar) {
      res.status(404).json({ message: "Avatar not found" });
      return;
    }

    // Delete image from storage
    await deleteFromStorage(avatar.imageUrl);
    await avatar.deleteOne();

    res.json({ message: "Avatar removed" });
  } catch (error) {
    console.error("Delete avatar error:", error);
    res.status(500).json({
      message: "Error deleting avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const createAIAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Extract data from FormData
    const name = req.body.name as string;
    const prompt = req.body.prompt as string;
    const style = req.body.style as string;
    const referenceImage = req.file;

    if (!name || !prompt) {
      res.status(400).json({ message: "Name and prompt are required" });
      return;
    }

    // Generate AI avatar
    const imageUrl = await generateAIAvatar({
      prompt,
      referenceImage,
    });

    // Create avatar in database
    const avatar = await Avatar.create({
      name,
      type: AvatarType.CUSTOM,
      imageUrl,
      owner: req.user!.id,
      isPublic: false,
      prompt, // Also save the prompt in the database
    });

    res.status(201).json(avatar);
  } catch (error) {
    console.error("Create AI avatar error:", error);
    res.status(500).json({
      message: "Error creating AI avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const createPublicAIAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Parse name and prompt, ensuring they are strings
    const name = String(req.body.name || "").trim();
    const prompt = String(req.body.prompt || "").trim();
    const referenceImage = req.file;

    if (!name || !prompt) {
      res.status(400).json({
        message: "Name and prompt are required",
        receivedData: { name, prompt },
        rawBody: req.body,
      });
      return;
    }

    // Generate AI avatar
    const imageUrl = await generateAIAvatar({
      prompt,
      referenceImage,
    });

    // Create avatar in database
    const avatar = await Avatar.create({
      name,
      type: AvatarType.PREDEFINED,
      imageUrl,
      prompt,
      isPublic: true,
    });

    res.status(201).json(avatar);
  } catch (error) {
    console.error("Create public AI avatar error:", error);
    res.status(500).json({
      message: "Error creating public AI avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
