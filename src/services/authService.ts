import jwt from "jsonwebtoken";
import { Response } from "express";
import { IUser } from "../models/User";

interface TokenPayload {
  userId: string;
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

export const setTokenCookies = (res: Response, tokens: Tokens): void => {
  // Set secure HTTP-only cookies
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    domain: process.env.COOKIE_DOMAIN,
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    domain: process.env.COOKIE_DOMAIN,
    path: "/api/auth/refresh", // Restrict refresh token to auth routes
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
