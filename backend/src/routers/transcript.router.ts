import { Router } from "express";
import {
  commitTranscript,
  convertTranscript,
  listTranscriptRuns,
  validateTranscript,
} from "../controllers/transcript.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { transcriptRateLimiter } from "../middlewares/rate-limit.middleware";
import { requireRole } from "../middlewares/role.middleware";
import {
  commitTranscriptSchema,
  convertTranscriptSchema,
  listRunsSchema,
  validateTranscriptSchema,
} from "../schemas/transcript.schema";
import { validate } from "../utils/validators";

const transcriptRouter = Router();

transcriptRouter.use(requireAuth, requireRole("ADMIN"), transcriptRateLimiter);

transcriptRouter.post("/convert", validate(convertTranscriptSchema), convertTranscript);
transcriptRouter.post("/commit", validate(commitTranscriptSchema), commitTranscript);
transcriptRouter.post("/validate", validate(validateTranscriptSchema), validateTranscript);
transcriptRouter.get("/runs", validate(listRunsSchema), listTranscriptRuns);

export default transcriptRouter;
