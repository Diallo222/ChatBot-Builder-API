import express from "express";
import {
  trainProjectAI,
  getTrainingStatus,
} from "../controllers/trainingController";
import multer from "multer";
import { protect } from "../middleware/auth";

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  },
});

router.post(
  "/:projectId/train",
  protect,
  upload.array("files"),
  trainProjectAI
);
router.get("/:projectId/status", protect, getTrainingStatus);

export default router;
