import type{ HydratedDocument } from "mongoose";
import type { IUser } from "../types/user";
import { HttpError } from "./errors";

export function sanitizeUser(user: HydratedDocument<IUser> | null) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isVerified: user.isVerified,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function checkAndUpdateEmailRateLimit(user: HydratedDocument<IUser>) {
  const now = new Date();
  const windowMinutes = user.emailRateLimit.resetAfterMinutes || 30;
  const windowStart = new Date(user.emailRateLimit.windowStart || now);
  const elapsed = (now.getTime() - windowStart.getTime()) / (1000 * 60);

  if (elapsed >= windowMinutes) {
    user.emailRateLimit.count = 0;
    user.emailRateLimit.windowStart = now;
  }

  if (user.emailRateLimit.count >= 5) {
    throw new HttpError(429, "Email limit reached. Please try again later.");
  }

  user.emailRateLimit.count += 1;
}
