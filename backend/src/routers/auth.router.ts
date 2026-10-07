import { Router } from "express";
import {
  login,
  logout,
  me,
  profile,
  refreshAccessToken,
} from "../controllers/auth.controller";
import { loginSchema, refreshTokenSchema } from "../schemas/auth.schema";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../utils/validators";

const authRouter = Router();

authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/refresh-token", validate(refreshTokenSchema), refreshAccessToken);
authRouter.post("/logout", logout);
authRouter.get("/profile", requireAuth, profile);
authRouter.get("/me", requireAuth, me);

export default authRouter;
