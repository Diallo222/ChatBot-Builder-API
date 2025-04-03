import express from "express";
import * as projectController from "../controllers/projectController";
import { protect } from "../middleware/auth";
import cloudinaryUpload from "../middleware/cloudinaryUpload";

const router = express.Router();

// All routes are protected
router.use(protect);

router.post(
  "/",
  cloudinaryUpload.single("image"),
  projectController.createProject
);
router.get("/", projectController.getProjects);
router.get("/:id", projectController.getProjectById);
router.put(
  "/:id",
  cloudinaryUpload.single("image"),
  projectController.updateProject
);
router.delete("/:id", projectController.deleteProject);
router.put("/:id/pages", projectController.updateSelectedPages);

// Configuration routes
router.get("/:id/configuration", projectController.getConfiguration);
router.put("/:id/configuration", projectController.updateConfiguration);
router.post("/:id/configuration/reset", projectController.resetConfiguration);

// Avatar routes
router.put("/:id/avatar", projectController.updateProjectAvatar);
router.post("/:id/avatar/reset", projectController.resetProjectAvatar);

router.post("/scrape-website", projectController.scrapeWebsitePages);
router.post("/check-website", projectController.checkWebsitePages);

export default router;
