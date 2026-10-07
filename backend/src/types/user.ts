import type { Document } from "mongoose";

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
