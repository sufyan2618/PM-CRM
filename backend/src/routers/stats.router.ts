import { Router } from "express";
import { getStats } from "../controllers/stats.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const statsRouter = Router();

statsRouter.get("/", requireAuth, requireRole("ADMIN"), getStats);

export default statsRouter;
