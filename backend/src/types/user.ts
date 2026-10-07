import type { Document } from "mongoose";

export type UserRole = "ADMIN" | "MANAGER" | "AGENT";

export interface IEmailRateLimit {
  count: number;
  windowStart: Date;
  resetAfterMinutes: number;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  code: string;
  role: UserRole;
  specialization: string;
  skills: string[];
  isVerified: boolean;
  loginAttempts: number;
  isBlocked: boolean;
  otp?: string;
  otpExpiry?: Date;
  otpPurpose?: "verify_email" | "reset_password";
  refreshToken?: string;
  refreshTokenExpiry?: Date;
  emailRateLimit: IEmailRateLimit;
  createdAt: Date;
  updatedAt: Date;
}

export function displayName(user: { firstName: string; lastName?: string }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
}
