import { describe, expect, test } from "bun:test";
import { parseAiDraft, stripMarkdownFences } from "../src/services/transcript/draft.parser";
import { HttpError } from "../src/utils/errors";

describe("draft.parser", () => {
  test("strips markdown fences", () => {
    const raw = '```json\n{"projects":[]}\n```';
    expect(stripMarkdownFences(raw)).toBe('{"projects":[]}');
  });

  test("parses valid JSON draft", () => {
    const draft = parseAiDraft(
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
                assigneeId: "DEV01",
                deadline: "2026-10-12",
                estimatedHours: "12",
              },
            ],
          },
        ],
      }),
    );
    expect(draft.projects?.[0]?.tasks?.[0]?.estimatedHours).toBe(12);
  });

  test("throws AI_FAILURE on invalid JSON", () => {
    expect(() => parseAiDraft("not-json")).toThrow(HttpError);
    try {
      parseAiDraft("not-json");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe("AI_FAILURE");
    }
  });
});
