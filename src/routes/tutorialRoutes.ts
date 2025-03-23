import express from "express";
import { auth } from "../middleware/auth";
import {
  createTutorial,
  getAllTutorials,
  getTutorialById,
  updateTutorial,
  deleteTutorial,
} from "../controllers/tutorialController";

const router = express.Router();

// Public routes
router.get("/tutorials", getAllTutorials);
router.get("/tutorials/:id", getTutorialById);

// Admin only routes
router.post("/tutorials", auth, createTutorial);
router.put("/tutorials/:id", auth, updateTutorial);
router.delete("/tutorials/:id", auth, deleteTutorial);

export default router;
