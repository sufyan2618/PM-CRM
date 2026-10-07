import { Router } from "express";
import {
  getMyTasksHandler,
  getTask,
  patchTask,
  removeTask,
} from "../controllers/task.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { myTasksSchema, taskIdParamsSchema, updateTaskSchema } from "../schemas/task.schema";
import { validate } from "../utils/validators";

const taskRouter = Router();

taskRouter.get("/my", requireAuth, requireRole("AGENT"), validate(myTasksSchema), getMyTasksHandler);
taskRouter.get("/:taskId", requireAuth, validate(taskIdParamsSchema), getTask);
taskRouter.patch(
  "/:taskId",
  requireAuth,
  requireRole("ADMIN"),
  validate(updateTaskSchema),
  patchTask,
);
taskRouter.delete(
  "/:taskId",
  requireAuth,
  requireRole("ADMIN"),
  validate(taskIdParamsSchema),
  removeTask,
);

export default taskRouter;
