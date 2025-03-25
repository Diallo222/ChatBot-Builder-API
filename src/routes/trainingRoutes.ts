import express from "express";
import {
  trainProjectAI,
  getTrainingStatus,
} from "../controllers/trainingController";

import { protect } from "../middleware/auth";
import handleDocumentUpload from "../utils/uploadDocument";

const router = express.Router();

router.post("/:projectId/train", protect, handleDocumentUpload, trainProjectAI);
router.get("/:projectId/status", protect, getTrainingStatus);

export default router;
