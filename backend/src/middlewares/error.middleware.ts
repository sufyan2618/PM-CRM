import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { HttpError, type ErrorCode } from "../utils/errors";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "Route not found", "NOT_FOUND"));
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let code: ErrorCode = "INTERNAL_ERROR";
  let message = "Internal server error";
  let details: unknown;

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid id format";
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = err.message;
  }

  if (statusCode >= 500) {
    logger.error(err.message, {
      stack: env.NODE_ENV === "production" ? undefined : err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}
