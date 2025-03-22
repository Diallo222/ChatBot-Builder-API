import jwt from "jsonwebtoken";
import { Response } from "express";
import { IUser } from "../models/User";
import { IAdmin } from "../models/Admin";

interface TokenPayload {
  userId: string;
  version: number; // For token invalidation
}

interface AdminTokenPayload {
  adminId: string;
  version: number; // For token invalidation
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const TOKEN_VERSION = 1;

export const generateTokens = (user: IUser): Tokens => {
  // Validate both secrets exist
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets are not configured properly");
  }

  const payload: TokenPayload = {
    userId: user._id.toString(),
    version: TOKEN_VERSION,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

export const generateAdminTokens = (admin: IAdmin): Tokens => {
  // Validate both secrets exist
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets are not configured properly");
  }

  const payload: AdminTokenPayload = {
    adminId: admin._id.toString(),
    version: TOKEN_VERSION,
  };
  // console.log("generateAdminTokens payload", payload);

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  // console.log("generateAdminTokens refreshToken", accessToken, refreshToken);
  return { accessToken, refreshToken };
};

export const setTokenCookies = (res: Response, tokens: Tokens): void => {
  // Set secure HTTP-only cookies
  // console.log("setTokenCookies tokens", tokens);
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN,
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN,
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN,
    path: "/api/admin/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearTokenCookies = (res: Response): void => {
  res.cookie("accessToken", "", { maxAge: 0, path: "/" });
  res.cookie("refreshToken", "", { maxAge: 0, path: "/api/auth/refresh" });
};

export const verifyToken = (
  token: string,
  isRefresh: boolean = false
): TokenPayload => {
  try {
    const secret = isRefresh
      ? process.env.JWT_REFRESH_SECRET
      : process.env.JWT_ACCESS_SECRET;

    return jwt.verify(token, secret as string) as TokenPayload;
  } catch (error) {
    throw new Error("Invalid token");
  }
};

export const verifyAdminToken = (
  token: string,
  isRefresh: boolean = false
): AdminTokenPayload => {
  try {
    const secret = isRefresh
      ? process.env.JWT_REFRESH_SECRET
      : process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error("JWT secret not configured");
    }

    return jwt.verify(token, secret) as AdminTokenPayload;
  } catch (error) {
    console.error("Token verification error:", error);
    throw new Error("Invalid or expired token");
  }
};
