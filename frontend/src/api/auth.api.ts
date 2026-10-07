import type {
  LoginInput,
  LoginResponse,
  MessageResponse,
  ProfileResponse,
  RefreshResponse,
  RegisterInput,
  ResendOtpInput,
  UpdatePasswordInput,
  VerifyOtpInput,
} from "../types/auth";
import { apiRequest } from "./client";

export const authApi = {
  register(input: RegisterInput) {
    return apiRequest<ProfileResponse>("/api/auth/register", {
      method: "POST",
      body: input,
      auth: false,
    });
  },

  verifyOtp(input: VerifyOtpInput) {
    return apiRequest<MessageResponse>("/api/auth/verify-otp", {
      method: "POST",
      body: input,
      auth: false,
    });
  },

  resendOtp(input: ResendOtpInput) {
    return apiRequest<MessageResponse>("/api/auth/resend-otp", {
      method: "POST",
      body: input,
      auth: false,
    });
  },

  login(input: LoginInput) {
    return apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: input,
      auth: false,
    });
  },

  refresh() {
    return apiRequest<RefreshResponse>("/api/auth/refresh-token", {
      method: "POST",
      body: {},
      auth: false,
    });
  },

  logout() {
    return apiRequest<MessageResponse>("/api/auth/logout", {
      method: "POST",
      auth: false,
    });
  },

  profile() {
    return apiRequest<ProfileResponse>("/api/auth/profile");
  },

  resetPassword(email: string) {
    return apiRequest<MessageResponse>("/api/auth/reset-password", {
      method: "POST",
      body: { email },
      auth: false,
    });
  },

  updatePassword(input: UpdatePasswordInput) {
    return apiRequest<MessageResponse>("/api/auth/update-password", {
      method: "POST",
      body: input,
      auth: false,
    });
  },
};
