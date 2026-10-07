import { Router } from "express";
import {
  getProject,
  getProjects,
  patchProject,
  removeProject,
} from "../controllers/project.controller";
import { getProjectTasks } from "../controllers/task.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import {
  listProjectsSchema,
  projectIdParamsSchema,
  updateProjectSchema,
} from "../schemas/project.schema";
import { projectTasksSchema } from "../schemas/task.schema";
import { validate } from "../utils/validators";

const projectRouter = Router();

projectRouter.get("/", requireAuth, validate(listProjectsSchema), getProjects);
projectRouter.get("/:projectId", requireAuth, validate(projectIdParamsSchema), getProject);
projectRouter.patch(
  "/:projectId",
  requireAuth,
  requireRole("ADMIN"),
  validate(updateProjectSchema),
  patchProject,
);
projectRouter.delete(
  "/:projectId",
  requireAuth,
  requireRole("ADMIN"),
  validate(projectIdParamsSchema),
  removeProject,
);
projectRouter.get(
  "/:projectId/tasks",
  requireAuth,
  validate(projectTasksSchema),
  getProjectTasks,
);

export default projectRouter;
