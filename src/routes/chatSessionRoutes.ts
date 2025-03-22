import express from "express";
import * as chatSessionController from "../controllers/chatSessionController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get(
  "/project/:projectId",
  protect,
  chatSessionController.getChatSessions
);
router.get(
  "/project/:projectId/stats",
  protect,
  chatSessionController.getChatSessionStats
);
router.get("/:sessionId", protect, chatSessionController.getChatSessionDetails);
router.post(
  "/project/:projectId",
  protect,
  chatSessionController.createChatSession
);
router.post("/:sessionId/messages", protect, chatSessionController.sendMessage);

export default router;
