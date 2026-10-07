import type { Request, Response } from "express";
import { listTeam } from "../services/team.service";
import type { UserRole } from "../types/user";
import { asyncHandler } from "../utils/async-handler";
import { HttpError } from "../utils/errors";

export const getTeam = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, "Unauthorized", "UNAUTHENTICATED");
  const query = (req.validated?.query ?? {}) as { role?: UserRole };
  const data = await listTeam(
    { userId: req.user.userId, role: req.user.role, code: req.user.code },
    query.role,
  );
  res.status(200).json({ success: true, data });
});
