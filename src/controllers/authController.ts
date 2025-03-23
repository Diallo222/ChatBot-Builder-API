import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User";
import Plan from "../models/Plan";
import {
  generateTokens,
  setTokenCookies,
  clearTokenCookies,
  verifyToken,
} from "../services/authService";
import { validatePassword } from "../utils/passwordUtils";
import dotenv from "dotenv";

dotenv.config();

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: "30d",
  });
};

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  console.log("req.body", req.body);

  try {
    const { email, password, fullName } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    // Get the free plan
    const freePlan = await Plan.findOne({ price: 0 });
    if (!freePlan) {
      console.log("freePlan", freePlan);

      res.status(404).json({ message: "Free plan not found" });
      return;
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      fullName,
      role: UserRole.USER,
      subscription: {
        plan: freePlan._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "active",
      },
    });

    if (user) {
      const tokens = generateTokens(user);
      setTokenCookies(res, tokens);
      res.status(201).json({
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("error", error);

    console.error("Register error:", error);
    res.status(500).json({
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  console.log("login route req.body", req.body);

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await validatePassword(password, user.password))) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const tokens = generateTokens(user);
    setTokenCookies(res, tokens);

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Error during login",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get user profile
export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  // console.log("getUserProfile route req.user", req.user);

  try {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user?.id)
      .select("-password")
      .populate("subscription.plan");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    // console.log("user", user);
    res.status(200).json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Update user profile
export const updateUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    user.fullName = req.body.fullName || user.fullName;
    user.email = req.body.email || user.email;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updatePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("updatePassword route req.body", req.body);
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Verify current password
    const isPasswordValid = await validatePassword(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  console.log("refresh route req.cookies", req.cookies);

  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token not found" });
      return;
    }

    const decoded = verifyToken(refreshToken, true);
    const user = await User.findById(decoded.userId); // Use 'id' instead of 'userId'
    console.log("user", user);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const tokens = generateTokens(user);
    setTokenCookies(res, tokens);

    res.json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  console.log("logout route req.cookies", req.cookies);
  try {
    clearTokenCookies(res);
    console.log("Logged out successfully");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Error during logout",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  console.log("me route req.user", req.user);

  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.log("me route error", error);

    console.error("Get user error:", error);
    res.status(500).json({
      message: "Error fetching user data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
