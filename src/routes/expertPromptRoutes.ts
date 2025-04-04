import express from "express";
import { auth } from "../middleware/auth";
import cloudinaryUpload from "../middleware/cloudinaryUpload";
import {
  createExpertPrompt,
  getAllExpertPrompts,
  getExpertPrompt,
  updateExpertPrompt,
  deleteExpertPrompt,
  getPublicExpertPrompts,
} from "../controllers/expertPromptController";

const router = express.Router();
router.get("/public", getPublicExpertPrompts);
// Admin routes (protected)
router.get("/", auth, getAllExpertPrompts);
router.post("/", auth, cloudinaryUpload.single("image"), createExpertPrompt);
router.get("/:id", auth, getExpertPrompt);
router.put("/:id", auth, cloudinaryUpload.single("image"), updateExpertPrompt);
router.delete("/:id", auth, deleteExpertPrompt);

export default router;
