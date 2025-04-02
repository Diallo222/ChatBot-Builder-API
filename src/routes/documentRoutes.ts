import express from "express";
import { getPublicDocument } from "../controllers/documentController";

const router = express.Router();

// Public route to get privacy policy or terms & conditions
router.get("/:type", getPublicDocument);

export default router;
