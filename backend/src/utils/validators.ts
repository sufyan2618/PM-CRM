import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { HttpError } from "./errors";

export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      const message = details.map((d) => d.message).join(", ") || "Validation failed";
      next(new HttpError(400, message, "VALIDATION_ERROR", details));
      return;
    }

    req.validated = parsed.data as {
      body?: unknown;
      params?: unknown;
      query?: unknown;
    };
    next();
  };
}
