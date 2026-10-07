import { createHash } from "crypto";
import { env } from "../config/env";
import type { LlmClient } from "../lib/llm/llm.types";
import { OpenAiCompatibleClient } from "../lib/llm/openai-compatible.client";
import { userRepository } from "../repositories/user.repository";
import { transcriptRunRepository } from "../repositories/transcript-run.repository";
import type { AiDraft } from "../schemas/transcript.schema";
import { displayName } from "../types/user";
import { HttpError } from "../utils/errors";
import { saveDraft } from "./draft-persistence.service";
import { parseAiDraft } from "./transcript/draft.parser";
import {
  buildDirectoryMaps,
  validateDraft,
  type DirectoryUser,
} from "./transcript/draft.validator";
import { buildSystemPrompt, buildUserPrompt } from "./transcript/prompt.builder";

function normalizeTranscript(transcript: string): string {
  return transcript.replace(/\r\n/g, "\n").trim();
}

function hashTranscript(transcript: string): string {
  return createHash("sha256").update(normalizeTranscript(transcript)).digest("hex");
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: number }).code === 11000,
  );
}

export type TranscriptServiceDeps = {
  llm: LlmClient;
  users: typeof userRepository;
  runs: typeof transcriptRunRepository;
  persist: typeof saveDraft;
};

async function loadDirectoryMaps(users: typeof userRepository) {
  const directory = await users.listForAiDirectory();
  const mapped: DirectoryUser[] = directory.map((u) => ({
    id: u._id.toString(),
    code: u.code,
    name: displayName(u),
    role: u.role,
  }));
  return {
    maps: buildDirectoryMaps(mapped),
    aiDirectory: directory
      .filter((u) => u.role === "MANAGER" || u.role === "AGENT")
      .map((u) => ({
        id: u.code,
        name: displayName(u),
        role: u.role,
        skills: u.skills ?? [],
      })),
  };
}

export function createTranscriptService(deps: TranscriptServiceDeps) {
  const { llm, users, runs, persist } = deps;

  async function convert(adminId: string, transcript: string, allowDuplicate = false) {
    if (!transcript?.trim()) {
      throw new HttpError(400, "Transcript is required", "VALIDATION_ERROR");
    }

    const normalized = normalizeTranscript(transcript);
    const transcriptHash = hashTranscript(normalized);

    if (!allowDuplicate) {
      const existing = await runs.findSucceededByHash(transcriptHash);
      if (existing) {
        throw new HttpError(
          409,
          "This transcript was already converted successfully. Pass allowDuplicate: true to convert again.",
          "DUPLICATE_TRANSCRIPT",
        );
      }
    }

    const staleBefore = new Date(Date.now() - env.LLM_TIMEOUT_MS * 2);
    await runs.markStaleProcessing(staleBefore);

    let runId: string;
    try {
      const run = await runs.createProcessing({
        createdBy: adminId,
        transcriptHash,
        transcriptLength: normalized.length,
        transcript: truncate(normalized, 100_000),
      });
      runId = run._id.toString();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new HttpError(
          409,
          "A transcript conversion is already in progress",
          "CONVERSION_IN_PROGRESS",
        );
      }
      throw error;
    }

    let finalized = false;
    const finalize = async (
      update: Parameters<typeof runs.updateStatus>[1],
    ) => {
      if (finalized) return;
      finalized = true;
      await runs.updateStatus(runId, update);
    };

    try {
      const { maps, aiDirectory } = await loadDirectoryMaps(users);
      const system = buildSystemPrompt();
      const userMsg = buildUserPrompt(aiDirectory, normalized);

      let rawOutput = "";
      let draft: AiDraft | null = null;
      let lastParseError: unknown;

      for (let attempt = 0; attempt < 2; attempt++) {
        rawOutput = await llm.completeJson({ system, user: userMsg });
        try {
          draft = parseAiDraft(rawOutput);
          lastParseError = null;
          break;
        } catch (error) {
          lastParseError = error;
        }
      }

      if (!draft) {
        await finalize({
          status: "FAILED",
          rawModelOutput: truncate(rawOutput, 50_000),
          errorMessage: "AI returned unparsable JSON",
        });
        if (lastParseError instanceof HttpError) throw lastParseError;
        throw new HttpError(502, "AI returned unparsable JSON", "AI_FAILURE");
      }

      const validation = validateDraft(draft, maps);
      if (!validation.valid) {
        await finalize({
          status: "NEEDS_CORRECTION",
          rawModelOutput: truncate(rawOutput, 50_000),
          draft,
          issues: validation.issues,
          errorMessage: "Draft validation failed",
        });
        throw new HttpError(
          422,
          "Some required fields could not be resolved. Nothing was saved.",
          "DRAFT_INVALID",
          {
            runId,
            draft,
            issues: validation.issues,
          },
        );
      }

      const saved = await persist(validation.resolved, runId);
      finalized = true;

      return {
        runId,
        projectCount: saved.projects.length,
        taskCount: saved.taskIds.length,
        projects: saved.projects,
      };
    } catch (error) {
      if (!finalized) {
        if (error instanceof HttpError && error.code === "DRAFT_INVALID") {
          // already finalized as NEEDS_CORRECTION
        } else if (error instanceof HttpError && error.code === "AI_FAILURE") {
          await finalize({
            status: "FAILED",
            errorMessage: error.message,
          });
        } else {
          await finalize({
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Unexpected error",
          });
        }
      }
      throw error;
    }
  }

  async function commit(adminId: string, draft: AiDraft, runId?: string) {
    const { maps } = await loadDirectoryMaps(users);
    const validation = validateDraft(draft, maps);

    if (!validation.valid) {
      if (runId) {
        await runs.updateStatus(runId, {
          status: "NEEDS_CORRECTION",
          draft,
          issues: validation.issues,
          errorMessage: "Draft validation failed",
        });
      }
      throw new HttpError(
        422,
        "Some required fields could not be resolved. Nothing was saved.",
        "DRAFT_INVALID",
        {
          runId: runId ?? null,
          draft,
          issues: validation.issues,
        },
      );
    }

    let effectiveRunId = runId;
    if (!effectiveRunId) {
      const run = await runs.createProcessing({
        createdBy: adminId,
        transcriptHash: createHash("sha256").update(JSON.stringify(draft)).digest("hex"),
        transcriptLength: 0,
      });
      effectiveRunId = run._id.toString();
    }

    const saved = await persist(validation.resolved, effectiveRunId);
    return {
      runId: effectiveRunId,
      projectCount: saved.projects.length,
      taskCount: saved.taskIds.length,
      projects: saved.projects,
    };
  }

  async function validateOnly(draft: AiDraft) {
    const { maps } = await loadDirectoryMaps(users);
    const validation = validateDraft(draft, maps);
    return {
      valid: validation.valid,
      issues: validation.issues,
    };
  }

  async function listRuns() {
    const runsList = await runs.listRecent(20);
    return runsList.map((r) => ({
      id: r._id.toString(),
      status: r.status,
      createdAt: r.createdAt,
      projectCount: r.createdProjectIds?.length ?? 0,
      errorMessage: r.errorMessage,
    }));
  }

  return { convert, commit, validateOnly, listRuns };
}

export const transcriptService = createTranscriptService({
  llm: new OpenAiCompatibleClient(),
  users: userRepository,
  runs: transcriptRunRepository,
  persist: saveDraft,
});
