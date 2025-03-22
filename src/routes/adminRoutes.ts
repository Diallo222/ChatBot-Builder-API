import express from "express";
import { auth } from "../middleware/auth";
import cloudinaryUpload from "../middleware/cloudinaryUpload";
import {
  login,
  updateCredentials,
  getAllUsers,
  getAvatars,
  updateAvatar,
  deleteAvatar,
  getOverview,
  refresh,
  logout,
} from "../controllers/adminController";
import {
  createAIAvatar,
  createPublicAvatar,
} from "../controllers/avatarController";

const router = express.Router();

// Route definitions
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", auth, logout);
router.put("/update", auth, updateCredentials);
router.get("/users", auth, getAllUsers);
router.get("/overview", auth, getOverview);
router.get("/avatars", auth, getAvatars);
router.post("/avatars/generate", auth, createAIAvatar);
router.post(
  "/avatars",
  auth,
  cloudinaryUpload.single("image"),
  createPublicAvatar
);
router.put(
  "/avatars/:id",
  auth,
  cloudinaryUpload.single("image"),
  updateAvatar
);
router.delete("/avatars/:id", auth, deleteAvatar);
export default router;
