import express from "express";
import {
  trainProjectAI,
  getTrainingStatus,
  updateKnowledgeFile,
  deleteKnowledgeFile,
  updateCustomFaq,
  deleteCustomFaq,
  addKnowledgeFile,
  addCustomFaq,
} from "../controllers/trainingController";

import { protect } from "../middleware/auth";
import handleDocumentUpload from "../utils/uploadDocument";

const router = express.Router();

router.post("/:projectId/train", protect, handleDocumentUpload, trainProjectAI);
router.get("/:projectId/status", protect, getTrainingStatus);
router.put(
  "/:projectId/knowledgefiles/:knowledgeFileId",
  protect,
  updateKnowledgeFile
);
router.delete(
  "/:projectId/knowledgefiles/:knowledgeFileId",
  protect,
  deleteKnowledgeFile
);
router.put("/:projectId/customfaqs/:faqId", protect, updateCustomFaq);
router.delete("/:projectId/customfaqs/:faqId", protect, deleteCustomFaq);
router.post(
  "/:projectId/knowledgefiles",
  protect,
  handleDocumentUpload,
  addKnowledgeFile
);
router.post("/:projectId/customfaqs", protect, addCustomFaq);

export default router;
