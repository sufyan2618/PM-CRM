import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors";
import { verifyAccessToken } from "../utils/jwt";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const accessToken = req.headers.authorization?.replace("Bearer ", "");

  if (!accessToken) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }

  try {
    req.user = verifyAccessToken(accessToken);
    next();
  } catch {
    next(new HttpError(401, "Invalid access token"));
  }
}
