import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/user";
import { HttpError } from "../utils/errors";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, "Unauthorized", "UNAUTHENTICATED"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "Forbidden", "FORBIDDEN"));
      return;
    }
    next();
  };
}
