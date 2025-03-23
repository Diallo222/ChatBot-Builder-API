import express from "express";
import { auth } from "../middleware/auth";
import cloudinaryUpload from "../middleware/cloudinaryUpload";
import {
  login,
  updateCredentials,
  getAllUsers,
  deleteAvatar,
  getOverview,
  refresh,
  logout,
  getSubscriptionsOverview,
  getUsersTransactions,
  downloadUsersTransactionsCSV,
} from "../controllers/adminController";
import {
  createPublicAIAvatar,
  createPublicAvatar,
  getPublicAvatars,
  updateAvatar,
} from "../controllers/avatarController";

const router = express.Router();

// Route definitions
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", auth, logout);
router.put("/update", auth, updateCredentials);
router.get("/users", auth, getAllUsers);
router.get("/overview", auth, getOverview);
router.get("/avatars", auth, getPublicAvatars);
router.post(
  "/avatars/generate",
  auth,
  cloudinaryUpload.single("image"),
  createPublicAIAvatar
);
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
router.get("/subscriptions-overview", auth, getSubscriptionsOverview);
router.get("/users-transactions", auth, getUsersTransactions);
router.get("/transactions/download", auth, downloadUsersTransactionsCSV);

export default router;
