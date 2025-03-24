import express from "express";
import * as chatSessionController from "../controllers/chatSessionController";
const router = express.Router();

// Public routes for chatbot widget
router.post("/project/:projectId", chatSessionController.createChatSession);
router.post("/:sessionId/messages", chatSessionController.sendMessage);

export default router;
