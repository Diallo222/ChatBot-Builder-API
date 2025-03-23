import express from "express";
import { protect, auth } from "../middleware/auth";
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
router.get("/", auth, getAdminTickets);
router.put("/:ticketId/respond", auth, respondToTicket);

export default router;
