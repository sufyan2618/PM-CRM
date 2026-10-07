import type { Request, Response } from "express";
import { getAdminStats } from "../services/stats.service";
import { asyncHandler } from "../utils/async-handler";

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getAdminStats();
  res.status(200).json({ success: true, data });
});
