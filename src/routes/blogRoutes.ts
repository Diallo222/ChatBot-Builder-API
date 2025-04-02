import express from "express";
import blogController from "../controllers/blogController";
import { auth } from "../middleware/auth";
import cloudinaryUpload from "../middleware/cloudinaryUpload";
const router = express.Router();

router.post(
  "/",
  auth,
  cloudinaryUpload.single("image"),
  blogController.createBlog
);
router.put(
  "/:id",
  cloudinaryUpload.single("image"),
  auth,
  blogController.updateBlog
);
router.delete("/:id", auth, blogController.deleteBlog);

// Public routes
router.get("/", blogController.getAllBlogs);
router.get("/:id", blogController.getBlogById);

export default router;
