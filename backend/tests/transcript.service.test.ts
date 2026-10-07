import { describe, expect, test } from "bun:test";
import mongoose from "mongoose";
import type { LlmClient } from "../src/lib/llm/llm.types";
import type { AiDraft } from "../src/schemas/transcript.schema";
import { createTranscriptService } from "../src/services/transcript.service";
import { HttpError } from "../src/utils/errors";

const adminId = new mongoose.Types.ObjectId().toString();
const pmId = new mongoose.Types.ObjectId().toString();
const agentId = new mongoose.Types.ObjectId().toString();

const users = {
  listForAiDirectory: async () => [
    {
      _id: { toString: () => pmId },
      firstName: "Ayesha",
      lastName: "Khan",
      email: "ayesha@novaworks.example",
      code: "PM01",
      role: "MANAGER" as const,
      specialization: "Manager / Web PM",
      skills: ["Web projects"],
    },
    {
      _id: { toString: () => agentId },
      firstName: "Ali",
      lastName: "Raza",
      email: "ali@novaworks.example",
      code: "DEV01",
      role: "AGENT" as const,
      specialization: "Agent / Full-Stack",
      skills: ["React"],
    },
  ],
};

function validAiJson(overrides?: Partial<AiDraft["projects"] extends (infer P)[] | null | undefined ? P : never>) {
  return JSON.stringify({
    projects: [
      {
        name: "UrbanCart Website",
        clientName: "UrbanCart Clothing",
        description: "desc",
        managerId: "PM01",
        deadline: "2026-10-20",
        tasks: [
          {
            title: "Product catalog UI",
            description: "ui",
            assigneeId: "DEV01",
            deadline: "2026-10-12",
            estimatedHours: 12,
          },
        ],
        ...overrides,
      },
    ],
  });
}

describe("transcript.service", () => {
  test("happy path creates projects and tasks", async () => {
    let saved = false;
    const llm: LlmClient = {
      completeJson: async () => validAiJson(),
    };

    const runs = {
      findSucceededByHash: async () => null,
      markStaleProcessing: async () => ({}),
      createProcessing: async () => ({
        _id: { toString: () => new mongoose.Types.ObjectId().toString() },
      }),
      updateStatus: async () => null,
      listRecent: async () => [],
      findById: async () => null,
      findProcessingByAdmin: async () => null,
      deleteAll: async () => ({}),
    };

    const persist = async () => {
      saved = true;
      return {
        projectIds: [new mongoose.Types.ObjectId()],
        taskIds: [new mongoose.Types.ObjectId()],
        projects: [
          {
            id: "p1",
            name: "UrbanCart Website",
            clientName: "UrbanCart Clothing",
            deadline: "2026-10-20",
            manager: { id: pmId, code: "PM01", name: "Ayesha Khan" },
            taskCount: 1,
            totalEstimatedHours: 12,
          },
        ],
      };
    };

    const service = createTranscriptService({
      llm,
      users: users as never,
      runs: runs as never,
      persist: persist as never,
    });

    const result = await service.convert(adminId, "x".repeat(60));
    expect(saved).toBe(true);
    expect(result.projectCount).toBe(1);
    expect(result.taskCount).toBe(1);
  });

  test("invalid draft saves nothing and returns DRAFT_INVALID", async () => {
    let saved = false;
    const llm: LlmClient = {
      completeJson: async () =>
        JSON.stringify({
          projects: [
            {
              name: "P",
              clientName: "C",
              managerId: "PM01",
              deadline: "2026-10-20",
              tasks: [
                {
                  title: "T",
                  assigneeId: "Kamran",
                  deadline: "2026-10-12",
                  estimatedHours: 5,
                },
              ],
            },
          ],
        }),
    };

    const statuses: string[] = [];
    const runs = {
      findSucceededByHash: async () => null,
      markStaleProcessing: async () => ({}),
      createProcessing: async () => ({
        _id: { toString: () => "run1" },
      }),
      updateStatus: async (_id: string, update: { status: string }) => {
        statuses.push(update.status);
        return null;
      },
      listRecent: async () => [],
      findById: async () => null,
      findProcessingByAdmin: async () => null,
      deleteAll: async () => ({}),
    };

    const persist = async () => {
      saved = true;
      return { projectIds: [], taskIds: [], projects: [] };
    };

    const service = createTranscriptService({
      llm,
      users: users as never,
      runs: runs as never,
      persist: persist as never,
    });

    try {
      await service.convert(adminId, "x".repeat(60));
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe("DRAFT_INVALID");
      expect((error as HttpError).statusCode).toBe(422);
    }
    expect(saved).toBe(false);
    expect(statuses).toContain("NEEDS_CORRECTION");
  });

  test("LLM failure returns 502 and nothing saved", async () => {
    let saved = false;
    const llm: LlmClient = {
      completeJson: async () => {
        throw new HttpError(502, "AI provider request failed", "AI_FAILURE");
      },
    };

    const statuses: string[] = [];
    const runs = {
      findSucceededByHash: async () => null,
      markStaleProcessing: async () => ({}),
      createProcessing: async () => ({
        _id: { toString: () => "run2" },
      }),
      updateStatus: async (_id: string, update: { status: string }) => {
        statuses.push(update.status);
        return null;
      },
      listRecent: async () => [],
      findById: async () => null,
      findProcessingByAdmin: async () => null,
      deleteAll: async () => ({}),
    };

    const service = createTranscriptService({
      llm,
      users: users as never,
      runs: runs as never,
      persist: (async () => {
        saved = true;
        return { projectIds: [], taskIds: [], projects: [] };
      }) as never,
    });

    try {
      await service.convert(adminId, "x".repeat(60));
      throw new Error("expected failure");
    } catch (error) {
      expect((error as HttpError).code).toBe("AI_FAILURE");
      expect((error as HttpError).statusCode).toBe(502);
    }
    expect(saved).toBe(false);
    expect(statuses).toContain("FAILED");
  });

  test("concurrent second call returns CONVERSION_IN_PROGRESS", async () => {
    const llm: LlmClient = {
      completeJson: async () => validAiJson(),
    };

    const runs = {
      findSucceededByHash: async () => null,
      markStaleProcessing: async () => ({}),
      createProcessing: async () => {
        const err = Object.assign(new Error("duplicate"), { code: 11000 });
        throw err;
      },
      updateStatus: async () => null,
      listRecent: async () => [],
      findById: async () => null,
      findProcessingByAdmin: async () => null,
      deleteAll: async () => ({}),
    };

    const service = createTranscriptService({
      llm,
      users: users as never,
      runs: runs as never,
      persist: (async () => ({ projectIds: [], taskIds: [], projects: [] })) as never,
    });

    try {
      await service.convert(adminId, "x".repeat(60));
      throw new Error("expected failure");
    } catch (error) {
      expect((error as HttpError).code).toBe("CONVERSION_IN_PROGRESS");
      expect((error as HttpError).statusCode).toBe(409);
    }
  });

  test("retries once on malformed JSON", async () => {
    let calls = 0;
    const llm: LlmClient = {
      completeJson: async () => {
        calls += 1;
        if (calls === 1) return "not-json";
        return validAiJson();
      },
    };

    const runs = {
      findSucceededByHash: async () => null,
      markStaleProcessing: async () => ({}),
      createProcessing: async () => ({
        _id: { toString: () => "run3" },
      }),
      updateStatus: async () => null,
      listRecent: async () => [],
      findById: async () => null,
      findProcessingByAdmin: async () => null,
      deleteAll: async () => ({}),
    };

    const service = createTranscriptService({
      llm,
      users: users as never,
      runs: runs as never,
      persist: (async () => ({
        projectIds: [new mongoose.Types.ObjectId()],
        taskIds: [new mongoose.Types.ObjectId()],
        projects: [
          {
            id: "p1",
            name: "UrbanCart Website",
            clientName: "UrbanCart Clothing",
            deadline: "2026-10-20",
            manager: { id: pmId, code: "PM01", name: "Ayesha Khan" },
            taskCount: 1,
            totalEstimatedHours: 12,
          },
        ],
      })) as never,
    });

    const result = await service.convert(adminId, "x".repeat(60));
    expect(calls).toBe(2);
    expect(result.projectCount).toBe(1);
  });
});
