import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { Admin, IAdmin } from "../models/Admin";
import { verifyToken, verifyAdminToken } from "../services/authService";
import rateLimit from "express-rate-limit";

interface JwtPayload {
  id: string;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      csrfToken(): string;
      admin?: { id: string };
    }
  }
}

// Rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: "Too many login attempts, please try again later",
});

// CSRF Protection
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers["x-csrf-token"];
  if (!token || token !== req.csrfToken?.()) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  next();
};

// Protected route middleware
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
};

export const admin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    const decoded = verifyAdminToken(accessToken);
    req.admin = { id: decoded.adminId };
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
