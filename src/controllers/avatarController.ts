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
    // Check if the request is coming from admin routes
    const isAdminRoute = req.baseUrl.includes("/admin");
    console.log("isAdminRoute", isAdminRoute);
    // Different query based on route
    const query = isAdminRoute
      ? { $or: [{ type: AvatarType.PREDEFINED }, { isPublic: true }] }
      : { $or: [{ isPublic: true }, { owner: req.user!.id }] };

    const avatars = await Avatar.find(query).sort({ createdAt: -1 });

    res.status(200).json(avatars);
  } catch (error) {
    console.error("Get avatars error:", error);
    res.status(500).json({
      message: "Error fetching avatars",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, prompt } = req.body;
    const file = req.file;

    const avatar = await Avatar.findOne({
      _id: req.params.id,
      owner: req.user!.id,
    });

    if (!avatar) {
      res.status(404).json({ message: "Avatar not found" });
      return;
    }

    if (name) avatar.name = name;
    if (prompt) avatar.prompt = prompt;
    if (file) {
      // Delete old image
      await deleteFromStorage(avatar.imageUrl);
      // Upload new image
      avatar.imageUrl = await uploadToStorage(file);
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
    const { name, prompt, style } = req.body;
    const referenceImage = req.file;

    // Generate AI avatar
    const imageUrl = await generateAIAvatar({
      prompt,
      referenceImage,
      style,
    });

    // Create avatar in database
    const avatar = await Avatar.create({
      name,
      type:
        req.user!.role === "admin" ? AvatarType.PREDEFINED : AvatarType.CUSTOM,
      imageUrl,
      owner: req.user!.id,
      isPublic: req.user!.role === "admin" ? true : false,
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
