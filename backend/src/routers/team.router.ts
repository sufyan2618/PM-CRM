import { Router } from "express";
import { getTeam } from "../controllers/team.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { teamQuerySchema } from "../schemas/team.schema";
import { validate } from "../utils/validators";

const teamRouter = Router();

teamRouter.get("/", requireAuth, validate(teamQuerySchema), getTeam);

export default teamRouter;
