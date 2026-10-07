import type { Request, Response } from "express";
import {
  deleteProject,
  getProjectById,
  listProjects,
  updateProject,
} from "../services/project.service";
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

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const query = (req.validated?.query ?? {}) as {
    page: number;
    limit: number;
    search?: string;
  };
  const result = await listProjects(scopeUser(req), query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const params = (req.validated?.params ?? req.params) as { projectId: string };
  const data = await getProjectById(scopeUser(req), params.projectId);
  res.status(200).json({ success: true, data });
});

export const patchProject = asyncHandler(async (req: Request, res: Response) => {
  const params = (req.validated?.params ?? req.params) as { projectId: string };
  const body = (req.validated?.body ?? req.body) as {
    name?: string;
    clientName?: string;
    description?: string;
    managerId?: string;
    deadline?: string;
  };
  const data = await updateProject(params.projectId, body);
  res.status(200).json({ success: true, data, message: "Project updated" });
});

export const removeProject = asyncHandler(async (req: Request, res: Response) => {
  const params = (req.validated?.params ?? req.params) as { projectId: string };
  const data = await deleteProject(params.projectId);
  res.status(200).json({ success: true, data, message: "Project deleted" });
});
