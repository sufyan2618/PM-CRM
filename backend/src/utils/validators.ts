import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";
import { HttpError } from "./errors";

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(", ");
      next(new HttpError(400, message));
      return;
    }

    next();
  };
}
