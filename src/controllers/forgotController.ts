import { Request, Response } from "express";
import User from "../models/User";
import { sendPasswordResetEmail } from "../utils/email";
import crypto from "crypto";

export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Generate a random 6-digit reset code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetCodeExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save the reset code and expiry
    user.resetCode = resetCode;
    user.resetCodeExpiry = resetCodeExpiry;
    await user.save();

    // Send reset email
    const emailSent = await sendPasswordResetEmail(email, resetCode);

    if (!emailSent) {
      res.status(500).json({ message: "Failed to send reset email" });
      return;
    }

    res.status(200).json({ message: "Reset code sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const verifyResetCodeAndUpdatePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, resetCode, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Verify reset code and expiry
    if (
      !user.resetCode ||
      !user.resetCodeExpiry ||
      user.resetCode !== resetCode
    ) {
      res.status(400).json({ message: "Invalid reset code" });
      return;
    }

    if (new Date() > user.resetCodeExpiry) {
      res.status(400).json({ message: "Reset code has expired" });
      return;
    }

    // Update password
    user.password = newPassword;
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
