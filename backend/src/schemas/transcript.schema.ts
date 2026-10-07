import { z } from "zod";
import { objectIdSchema } from "./common.schema";

const nullableString = z.union([z.string(), z.null()]).optional();

export const AiTaskSchema = z
  .object({
    title: nullableString,
    description: nullableString,
    assigneeId: nullableString,
    deadline: nullableString,
    estimatedHours: z
      .union([z.number(), z.string(), z.null()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined || val === "") return null;
        if (typeof val === "number") return val;
        const n = Number(val);
        return Number.isFinite(n) ? n : null;
      }),
  })
  .passthrough();

export const AiProjectSchema = z
  .object({
    name: nullableString,
    clientName: nullableString,
    description: nullableString,
    managerId: nullableString,
    deadline: nullableString,
    tasks: z.array(AiTaskSchema).optional().nullable(),
  })
  .passthrough();

export const AiDraftSchema = z
  .object({
    projects: z.array(AiProjectSchema).optional().nullable(),
  })
  .passthrough();

export type AiDraft = z.infer<typeof AiDraftSchema>;
export type AiProject = z.infer<typeof AiProjectSchema>;
export type AiTask = z.infer<typeof AiTaskSchema>;

export const convertTranscriptSchema = z.object({
  body: z
    .object({
      transcript: z
        .string()
        .trim()
        .min(50, "Transcript must be at least 50 characters")
        .max(100_000, "Transcript is too long"),
      allowDuplicate: z.boolean().optional().default(false),
    })
    .strict(),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const commitTranscriptSchema = z.object({
  body: z
    .object({
      runId: objectIdSchema.optional(),
      draft: AiDraftSchema,
    })
    .strict(),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const validateTranscriptSchema = z.object({
  body: z
    .object({
      draft: AiDraftSchema,
    })
    .strict(),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listRunsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});
