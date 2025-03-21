import express from "express";
import { protect, admin } from "../middleware/auth";
import { uploadFilesMiddleware, upload } from "../utils/fileUpload";
import {
  createTicket,
  getUserTickets,
  getAdminTickets,
  respondToTicket,
} from "../controllers/ticketController";

const router = express.Router();

router.post(
  "/",
  protect,
  upload.array("files", 5),
  uploadFilesMiddleware,
  createTicket
);
router.get("/my-tickets", protect, getUserTickets);
router.get("/admin", protect, admin, getAdminTickets);
router.put("/:ticketId/respond", protect, admin, respondToTicket);

export default router;
