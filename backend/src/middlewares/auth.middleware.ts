import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors";
import { verifyAccessToken } from "../utils/jwt";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const accessToken = req.headers.authorization?.replace("Bearer ", "");

  if (!accessToken) {
    next(new HttpError(401, "Unauthorized", "UNAUTHENTICATED"));
    return;
  }

  try {
    const decoded = verifyAccessToken(accessToken);
    if (!decoded.role || !decoded.code) {
      next(new HttpError(401, "Invalid access token", "UNAUTHENTICATED"));
      return;
    }
    req.user = decoded;
    next();
  } catch {
    next(new HttpError(401, "Invalid access token", "UNAUTHENTICATED"));
  }
}
