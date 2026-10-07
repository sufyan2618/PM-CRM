import type { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/async-handler";

const startedAt = Date.now();

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const db = dbState === 1 ? "up" : "down";

  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      db,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    },
  });
});
