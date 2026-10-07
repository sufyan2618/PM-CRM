import type { Request, Response } from "express";
import type { HydratedDocument } from "mongoose";
import { UserModel } from "../models/user.model";
import type { IUser } from "../types/user";
import { asyncHandler } from "../utils/async-handler";
import { HttpError } from "../utils/errors";
import {
  clearAuthCookie,
  getTokenExpiryDate,
  setRefreshTokenCookie,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { generateOtp, otpExpiry } from "../utils/otp";
import { comparePassword, hashPassword } from "../utils/password";
import { addOtpEmailJob } from "../queues/email.queue";
import { sanitizeUser, checkAndUpdateEmailRateLimit } from "../utils/functions";

async function issueTokensAndPersistRefresh(user: HydratedDocument<IUser>) {
  const payload = { userId: user._id.toString(), email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  user.refreshToken = refreshToken;
  user.refreshTokenExpiry = getTokenExpiryDate(refreshToken);
  await user.save();
  return { accessToken, refreshToken };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new HttpError(409, "User already exists");
  }

  const otp = generateOtp();
  const user = await UserModel.create({
    firstName,
    lastName,
    email,
    password: await hashPassword(password),
    otp,
    otpExpiry: otpExpiry(),
    otpPurpose: "verify_email",
  });

  checkAndUpdateEmailRateLimit(user);
  await user.save();

  await addOtpEmailJob({
    to: user.email,
    subject: "Verify your email",
    otp,
    purpose: "verify_email",
  });

  res.status(201).json({
    success: true,
    message: "Registered successfully. OTP sent to email.",
    data: sanitizeUser(user),
  });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, purpose } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (!user.otp || !user.otpExpiry || !user.otpPurpose) {
    throw new HttpError(400, "No OTP found");
  }

  if (user.otpPurpose !== purpose) {
    throw new HttpError(400, "OTP purpose mismatch");
  }

  if (user.otp !== otp) {
    throw new HttpError(400, "Invalid OTP");
  }

  if (user.otpExpiry.getTime() < Date.now()) {
    throw new HttpError(400, "OTP expired");
  }

  if (purpose === "verify_email") {
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpPurpose = undefined;
  }
  await user.save();

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
  });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, purpose } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  checkAndUpdateEmailRateLimit(user);

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = otpExpiry();
  user.otpPurpose = purpose;
  await user.save();

  await addOtpEmailJob({
    to: user.email,
    subject: purpose === "verify_email" ? "Verify your email" : "Reset your password",
    otp,
    purpose,
  });

  res.status(200).json({
    success: true,
    message: "OTP sent successfully",
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  if (user.isBlocked) {
    throw new HttpError(403, "Account blocked due to too many failed attempts");
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.isBlocked = true;
    }
    await user.save();
    throw new HttpError(401, "Invalid credentials");
  }

  if (!user.isVerified) {
    throw new HttpError(403, "Please verify your email first");
  }

  user.loginAttempts = 0;
  await user.save();

  const { accessToken, refreshToken } = await issueTokensAndPersistRefresh(user);
  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    data: sanitizeUser(user),
  });
});

export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new HttpError(401, "Refresh token not found");
  }

  let decoded: { userId: string; email: string };
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }

  const user = await UserModel.findById(decoded.userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (!user.refreshToken || user.refreshToken !== refreshToken) {
    throw new HttpError(401, "Refresh token mismatch");
  }

  if (!user.refreshTokenExpiry || user.refreshTokenExpiry.getTime() < Date.now()) {
    throw new HttpError(401, "Refresh token expired");
  }

  const tokens = await issueTokensAndPersistRefresh(user);
  setRefreshTokenCookie(res, tokens.refreshToken);

  res.status(200).json({
    success: true,
    message: "Access token refreshed successfully",
    accessToken: tokens.accessToken,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const user = await UserModel.findOne({ refreshToken });
    if (user) {
      user.refreshToken = undefined;
      user.refreshTokenExpiry = undefined;
      await user.save();
    }
  }

  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export const profile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const user = await UserModel.findById(req.user.userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  res.status(200).json({
    success: true,
    data: sanitizeUser(user),
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  checkAndUpdateEmailRateLimit(user);

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = otpExpiry();
  user.otpPurpose = "reset_password";
  await user.save();

  await addOtpEmailJob({
    to: user.email,
    subject: "Reset your password",
    otp,
    purpose: "reset_password",
  });

  res.status(200).json({
    success: true,
    message: "Password reset OTP sent",
  });
});

export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (!user.otp || !user.otpExpiry || user.otpPurpose !== "reset_password") {
    throw new HttpError(400, "No reset OTP found");
  }

  if (user.otp !== otp) {
    throw new HttpError(400, "Invalid OTP");
  }

  if (user.otpExpiry.getTime() < Date.now()) {
    throw new HttpError(400, "OTP expired");
  }

  user.password = await hashPassword(newPassword);
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.otpPurpose = undefined;
  user.refreshToken = undefined;
  user.refreshTokenExpiry = undefined;
  user.loginAttempts = 0;
  user.isBlocked = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});
