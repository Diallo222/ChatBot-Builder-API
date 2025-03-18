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

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    // Get the free plan
    const freePlan = await Plan.findOne({ name: "Free" });
    if (!freePlan) {
      res.status(500).json({ message: "Free plan not found" });
      return;
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: UserRole.USER,
      subscription: {
        plan: freePlan._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "active",
      },
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
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
    setTokenCookies(res, tokens);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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
  try {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user?.id)
      .select("-password")
      .populate("subscription.plan");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
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

    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role,
      token: generateToken(updatedUser._id.toString()),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

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
    setTokenCookies(res, tokens);

    res.json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  clearTokenCookies(res);
  res.json({ message: "Logged out successfully" });
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
        firstName: user.firstName,
        lastName: user.lastName,
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
