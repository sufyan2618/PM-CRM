import type { Request, Response } from "express";
import type { AiDraft } from "../schemas/transcript.schema";
import { transcriptService } from "../services/transcript.service";
import { asyncHandler } from "../utils/async-handler";
import { HttpError } from "../utils/errors";

function adminId(req: Request): string {
  if (!req.user) throw new HttpError(401, "Unauthorized", "UNAUTHENTICATED");
  return req.user.userId;
}

export const convertTranscript = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.validated?.body ?? req.body) as {
    transcript: string;
    allowDuplicate?: boolean;
  };
  const data = await transcriptService.convert(adminId(req), body.transcript, body.allowDuplicate);
  res.status(201).json({
    success: true,
    data,
    message: `Created ${data.projectCount} projects with ${data.taskCount} tasks`,
  });
});

export const commitTranscript = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.validated?.body ?? req.body) as {
    runId?: string;
    draft: AiDraft;
  };
  const data = await transcriptService.commit(adminId(req), body.draft, body.runId);
  res.status(201).json({
    success: true,
    data,
    message: `Created ${data.projectCount} projects with ${data.taskCount} tasks`,
  });
});

export const validateTranscript = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.validated?.body ?? req.body) as { draft: AiDraft };
  const data = await transcriptService.validateOnly(body.draft);
  res.status(200).json({ success: true, data });
});

export const listTranscriptRuns = asyncHandler(async (_req: Request, res: Response) => {
  const data = await transcriptService.listRuns();
  res.status(200).json({ success: true, data });
});
