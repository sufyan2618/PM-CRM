import mongoose, { Schema } from "mongoose";
import type { IUser } from "../types/user";

const emailRateLimitSchema = new Schema(
  {
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
    resetAfterMinutes: { type: Number, default: 30 },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
    otpPurpose: { type: String, enum: ["verify_email", "reset_password"] },
    refreshToken: { type: String },
    refreshTokenExpiry: { type: Date },
    emailRateLimit: { type: emailRateLimitSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<IUser>("User", userSchema);
