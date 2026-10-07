import jwt from "jsonwebtoken";
import type { Response } from "express";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface BaseTokenPayload {
  userId: string;
  email: string;
}

export interface JwtPayload extends BaseTokenPayload {
  tokenType: "access" | "refresh";
  exp?: number;
}

export interface AccessTokenPayload extends BaseTokenPayload {
  tokenType: "access";
  exp?: number;
}

export interface RefreshTokenPayload extends BaseTokenPayload {
  tokenType: "refresh";
  exp?: number;
}

export function signAccessToken(payload: BaseTokenPayload) {
  return jwt.sign({ ...payload, tokenType: "access" }, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: BaseTokenPayload) {
  return jwt.sign({ ...payload, tokenType: "refresh" }, env.JWT_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  if (decoded.tokenType !== "access") {
    throw new Error("Invalid access token");
  }
  return decoded as AccessTokenPayload;
}

export function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  if (decoded.tokenType !== "refresh") {
    throw new Error("Invalid refresh token");
  }
  return decoded as RefreshTokenPayload;
}

export function getTokenExpiryDate(token: string) {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    throw new Error("Token expiry not found");
  }
  return new Date(decoded.exp * 1000);
}

export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
  });
}
