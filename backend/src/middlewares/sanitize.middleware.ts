import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors";

function hasDangerousKeys(value: unknown, depth = 0): boolean {
  if (depth > 20 || value === null || value === undefined) return false;
  if (Array.isArray(value)) {
    return value.some((item) => hasDangerousKeys(item, depth + 1));
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (key.startsWith("$") || key.includes(".")) return true;
      if (hasDangerousKeys((value as Record<string, unknown>)[key], depth + 1)) return true;
    }
  }
  return false;
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction) {
  if (hasDangerousKeys(req.body) || hasDangerousKeys(req.query) || hasDangerousKeys(req.params)) {
    next(new HttpError(400, "Request contains forbidden keys", "VALIDATION_ERROR"));
    return;
  }
  next();
}
