import type { Request, Response } from "express";
import { listTeam } from "../services/team.service";
import type { UserRole } from "../types/user";
import { asyncHandler } from "../utils/async-handler";

export const getTeam = asyncHandler(async (req: Request, res: Response) => {
  const query = (req.validated?.query ?? {}) as { role?: UserRole };
  const data = await listTeam(query.role);
  res.status(200).json({ success: true, data });
});
