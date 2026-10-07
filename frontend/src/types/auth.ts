export type OtpPurpose = "verify_email" | "reset_password";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: "ADMIN" | "MANAGER" | "AGENT";
  code?: string;
  specialization?: string;
  skills?: string[];
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MessageResponse = {
  success: boolean;
  message: string;
};

export type ProfileResponse = MessageResponse & {
  data: User;
};

export type LoginResponse = ProfileResponse & {
  accessToken: string;
};

export type RefreshResponse = MessageResponse & {
  accessToken: string;
};

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type VerifyOtpInput = {
  email: string;
  otp: string;
  purpose: OtpPurpose;
};

export type ResendOtpInput = {
  email: string;
  purpose: OtpPurpose;
};

export type UpdatePasswordInput = {
  email: string;
  otp: string;
  newPassword: string;
};
