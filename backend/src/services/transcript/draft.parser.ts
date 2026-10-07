import { AiDraftSchema, type AiDraft } from "../../schemas/transcript.schema";
import { HttpError } from "../../utils/errors";

export function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

export function parseAiDraft(raw: string): AiDraft {
  const cleaned = stripMarkdownFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, "AI returned unparsable JSON", "AI_FAILURE");
  }

  const result = AiDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new HttpError(502, "AI returned JSON with invalid shape", "AI_FAILURE", {
      issues: result.error.issues,
    });
  }
  return result.data;
}
