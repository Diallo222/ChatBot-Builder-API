import express from "express";
import * as projectController from "../controllers/projectController";
import { protect } from "../middleware/auth";

const router = express.Router();

// All routes are protected
router.use(protect);

router.post("/", projectController.createProject);
router.get("/", projectController.getProjects);
router.get("/:id", projectController.getProjectById);
router.put("/:id", projectController.updateProject);
router.delete("/:id", projectController.deleteProject);
router.put("/:id/pages", projectController.updateSelectedPages);

export default router;
