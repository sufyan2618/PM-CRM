import { Router } from "express";
import { getHealth } from "../controllers/health.controller";
import authRouter from "./auth.router";
import projectRouter from "./project.router";
import statsRouter from "./stats.router";
import taskRouter from "./task.router";
import teamRouter from "./team.router";
import transcriptRouter from "./transcript.router";

const apiRouter = Router();

apiRouter.get("/health", getHealth);
apiRouter.use("/auth", authRouter);
apiRouter.use("/team", teamRouter);
apiRouter.use("/projects", projectRouter);
apiRouter.use("/tasks", taskRouter);
apiRouter.use("/transcripts", transcriptRouter);
apiRouter.use("/stats", statsRouter);

export default apiRouter;
