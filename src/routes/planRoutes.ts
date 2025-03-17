import express from "express";
import * as planController from "../controllers/planController";
import { protect, admin } from "../middleware/auth";

const router = express.Router();

// Public routes
router.get("/", planController.getPlans);

// Protected routes
router.post("/subscribe", protect, planController.subscribeToPlan);

// Admin routes
router.post("/", protect, admin, planController.createPlan);
router.put("/:id", protect, admin, planController.updatePlan);
router.delete("/:id", protect, admin, planController.deletePlan);

export default router;
