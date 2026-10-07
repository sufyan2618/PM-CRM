import { z } from "zod";
import { isoDateSchema, objectIdSchema, paginationQuerySchema } from "./common.schema";

export const listProjectsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: paginationQuerySchema,
});

export const projectIdParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    projectId: objectIdSchema,
  }),
  query: z.object({}).default({}),
});

export const updateProjectSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(150).optional(),
      clientName: z.string().trim().min(1).max(150).optional(),
      description: z.string().max(2000).optional(),
      managerId: objectIdSchema.optional(),
      deadline: isoDateSchema.optional(),
    })
    .strict(),
  params: z.object({
    projectId: objectIdSchema,
  }),
  query: z.object({}).default({}),
});
