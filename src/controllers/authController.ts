import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User";
import Plan from "../models/Plan";
import {
  generateTokens,
  setTokenCookies,
  clearTokenCookies,
  verifyToken,
  returnTokens,
  extractTokenFromHeader,
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

      res.status(201).json({
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tokens: returnTokens(tokens),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Register error:", error);
    console.error("Register error:", error);
    res.status(500).json({
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await validatePassword(password, user.password))) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const tokens = generateTokens(user);

    // Return tokens in response body instead of setting cookies
    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
      tokens: returnTokens(tokens),
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
  console.log("getUserProfile", req.user);
  try {
    // Add explicit type for populated user
    const user = await User.findById(req.user?._id)
      .select("-password -resetCode -resetCodeExpiry")
      .populate({
        path: "subscription.plan",
        select: "name price features", // Explicitly select plan fields
      });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Structure response with only necessary data
    res.status(200).json({
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      subscription: {
        plan: user.subscription.plan,
        status: user.subscription.status,
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate,
      },
      createdAt: user.createdAt,
    });
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
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    const refreshToken = extractTokenFromHeader(authHeader);

    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token not found" });
      return;
    }

    const decoded = verifyToken(refreshToken, true);
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const tokens = generateTokens(user);

    // Return new tokens in response
    res.json({
      message: "Token refreshed successfully",
      tokens: returnTokens(tokens),
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // For Bearer token auth, client-side should simply discard the tokens
  // No server-side action needed as tokens are stateless
  res.status(200).json({ message: "Logged out successfully" });
};

export const me = async (req: Request, res: Response): Promise<void> => {
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
    console.error("Get user error:", error);
    res.status(500).json({
      message: "Error fetching user data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
