import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { verifyToken } from "../services/authService";
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
      admin?: any;
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

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Please authenticate" });
  }
};
