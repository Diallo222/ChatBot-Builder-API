import express from "express";
import {
  requestPasswordReset,
  verifyResetCodeAndUpdatePassword,
} from "../controllers/forgotController";

const router = express.Router();

router.post("/request-reset", requestPasswordReset);
router.post("/verify-reset", verifyResetCodeAndUpdatePassword);

export default router;
