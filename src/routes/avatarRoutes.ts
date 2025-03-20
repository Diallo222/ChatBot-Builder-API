import express from "express";
import * as avatarController from "../controllers/avatarController";
import { protect, admin } from "../middleware/auth";
import cloudinaryUpload from "../middleware/cloudinaryUpload";

const router = express.Router();

// Protected routes
router.use(protect);

router.post(
  "/",
  cloudinaryUpload.single("image"),
  avatarController.createAvatar
);
router.get("/", avatarController.getAvatars);
router.put(
  "/:id",
  cloudinaryUpload.single("image"),
  avatarController.updateAvatar
);
// Admin routes
router.post(
  "/public",
  protect,
  admin,
  cloudinaryUpload.single("image"),
  avatarController.createPublicAvatar
);

// AI Avatar generation route
router.post(
  "/generate",
  protect,
  cloudinaryUpload.single("image"), // Optional reference image
  avatarController.createAIAvatar
);

export default router;
