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

// Configuration routes
router.get("/:id/configuration", projectController.getConfiguration);
router.put("/:id/configuration", projectController.updateConfiguration);
router.post("/:id/configuration/reset", projectController.resetConfiguration);

// Avatar routes
router.put("/:id/avatar", projectController.updateProjectAvatar);
router.post("/:id/avatar/reset", projectController.resetProjectAvatar);

export default router;
