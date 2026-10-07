import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";
import { HttpError } from "../utils/errors";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "Route not found"));
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;

  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
}
