import { Router } from "express";
import {
  login,
  logout,
  profile,
  refreshAccessToken,
  register,
  resendOtp,
  resetPassword,
  updatePassword,
  verifyOtp,
} from "../controllers/auth.controller";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  verifyOtpSchema,
} from "../schemas/auth.schema";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../utils/validators";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), register);
authRouter.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
authRouter.post("/resend-otp", validate(resendOtpSchema), resendOtp);
authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/refresh-token", validate(refreshTokenSchema), refreshAccessToken);
authRouter.post("/logout", logout);
authRouter.get("/profile", requireAuth, profile);
authRouter.post("/reset-password", validate(resetPasswordSchema), resetPassword);
authRouter.post("/update-password", validate(updatePasswordSchema), updatePassword);

export default authRouter;
