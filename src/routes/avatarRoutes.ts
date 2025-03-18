import express from "express";
import multer from "multer";
import * as avatarController from "../controllers/avatarController";
import { protect, admin } from "../middleware/auth";

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."));
    }
  },
});

// Protected routes
router.use(protect);

router.post("/", upload.single("image"), avatarController.createAvatar);
router.get("/", avatarController.getAvatars);
router.put("/:id", upload.single("image"), avatarController.updateAvatar);
router.delete("/:id", avatarController.deleteAvatar);

// Admin routes
router.post(
  "/public",
  protect,
  admin,
  upload.single("image"),
  avatarController.createPublicAvatar
);

// AI Avatar generation route
router.post(
  "/generate",
  protect,
  upload.single("referenceImage"), // Optional reference image
  avatarController.createAIAvatar
);

export default router;
