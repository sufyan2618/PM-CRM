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
    lastName: { type: String, default: "", trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "AGENT"],
      required: true,
      index: true,
    },
    specialization: { type: String, default: "", trim: true },
    skills: { type: [String], default: [] },
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

userSchema.set("toJSON", {
  transform(_doc, ret) {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = String(obj._id);
    delete obj._id;
    delete obj.__v;
    delete obj.password;
    return obj;
  },
});

export const UserModel = mongoose.model<IUser>("User", userSchema);
