import express from "express";
import * as conversationController from "../controllers/conversationController";
import { protect } from "../middleware/auth";

const router = express.Router();

// Public routes for chatbot widget
router.post("/start", conversationController.startConversation);
router.post("/:id/message", conversationController.sendMessage);

// Protected routes for project owners
router.get(
  "/project/:projectId",
  protect,
  conversationController.getConversationHistory
);

export default router;
