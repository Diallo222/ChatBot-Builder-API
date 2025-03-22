import express from "express";
import * as authController from "../controllers/authController";
import { protect } from "../middleware/auth";

const router = express.Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
// Protected routes
router.get("/profile", protect, authController.getUserProfile);
router.put("/profile", protect, authController.updateUserProfile);
router.put("/password", protect, authController.updatePassword);

export default router;
