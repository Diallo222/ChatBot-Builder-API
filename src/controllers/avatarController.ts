import { Request, Response } from "express";
import Avatar, { AvatarType } from "../models/Avatar";
import { uploadToStorage, deleteFromStorage } from "../services/storageService";

export const createAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, type } = req.body;
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

export const getAvatars = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get both public avatars and user's custom avatars
    const avatars = await Avatar.find({
      $or: [{ isPublic: true }, { owner: req.user!.id }],
    }).sort({ createdAt: -1 });

    res.json(avatars);
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
    const { name } = req.body;
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

// Admin endpoints
export const createPublicAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name } = req.body;
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
