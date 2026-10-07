import { z } from "zod";

export const teamQuerySchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    role: z.enum(["ADMIN", "MANAGER", "AGENT"]).optional(),
  }),
});
