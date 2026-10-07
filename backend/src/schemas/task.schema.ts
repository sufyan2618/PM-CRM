import { z } from "zod";
import { isoDateSchema, objectIdSchema } from "./common.schema";

export const projectTasksSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    projectId: objectIdSchema,
  }),
  query: z.object({}).default({}),
});

export const myTasksSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    projectId: objectIdSchema.optional(),
  }),
});

export const taskIdParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    taskId: objectIdSchema,
  }),
  query: z.object({}).default({}),
});

export const updateTaskSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(150).optional(),
      description: z.string().max(2000).optional(),
      assigneeId: objectIdSchema.optional(),
      deadline: isoDateSchema.optional(),
      estimatedHours: z.number().gt(0).max(1000).optional(),
    })
    .strict(),
  params: z.object({
    taskId: objectIdSchema,
  }),
  query: z.object({}).default({}),
});
