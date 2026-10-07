import { z } from "zod";

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[@$!%*?&]/, "Password must contain at least one special character (@$!%*?&)");

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: passwordSchema,
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    purpose: z.enum(["verify_email", "reset_password"]).default("verify_email"),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    purpose: z.enum(["verify_email", "reset_password"]).default("verify_email"),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const refreshTokenSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updatePasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: passwordSchema,
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});
