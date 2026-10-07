import type { Request, Response } from "express";
import {
  deleteTask,
  getMyTasks,
  getTaskById,
  listProjectTasks,
  updateTask,
} from "../services/task.service";
import { asyncHandler } from "../utils/async-handler";
import { HttpError } from "../utils/errors";

function scopeUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Unauthorized", "UNAUTHENTICATED");
  return {
    userId: req.user.userId,
    role: req.user.role,
    code: req.user.code,
  };
}

export const getProjectTasks = asyncHandler(async (req: Request, res: Response) => {
  const params = (req.validated?.params ?? req.params) as { projectId: string };
  const data = await listProjectTasks(scopeUser(req), params.projectId);
  res.status(200).json({ success: true, data });
});

export const getMyTasksHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req.validated?.query ?? {}) as { projectId?: string };
  const data = await getMyTasks(scopeUser(req), query.projectId);
  res.status(200).json({ success: true, data });
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const params = (req.validated?.params ?? req.params) as { taskId: string };
  const data = await getTaskById(scopeUser(req), params.taskId);
  res.status(200).json({ success: true, data });
});

export const patchTask = asyncHandler(async (req: Request, res: Response) => {
  const params = (req.validated?.params ?? req.params) as { taskId: string };
  const body = (req.validated?.body ?? req.body) as {
    title?: string;
    description?: string;
    assigneeId?: string;
    deadline?: string;
    estimatedHours?: number;
  };
  const data = await updateTask(params.taskId, body);
  res.status(200).json({ success: true, data, message: "Task updated" });
});

export const removeTask = asyncHandler(async (req: Request, res: Response) => {
  const params = (req.validated?.params ?? req.params) as { taskId: string };
  const data = await deleteTask(params.taskId);
  res.status(200).json({ success: true, data, message: "Task deleted" });
});
