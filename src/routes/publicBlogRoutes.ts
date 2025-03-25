import express from "express";
import blogController from "../controllers/blogController";
const router = express.Router();

// Public routes
router.get("/", blogController.getAllBlogs);
router.get("/:id", blogController.getBlogById);

export default router;
