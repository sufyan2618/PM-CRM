import { describe, expect, test } from "bun:test";
import {
  buildDirectoryMaps,
  validateDraft,
  type DirectoryUser,
} from "../src/services/transcript/draft.validator";
import type { AiDraft } from "../src/schemas/transcript.schema";

const directory: DirectoryUser[] = [
  { id: "m1", code: "PM01", name: "Ayesha Khan", role: "MANAGER" },
  { id: "m2", code: "PM02", name: "Bilal Ahmed", role: "MANAGER" },
  { id: "a1", code: "DEV01", name: "Ali Raza", role: "AGENT" },
  { id: "a2", code: "DEV02", name: "Hamza Shah", role: "AGENT" },
];

const maps = buildDirectoryMaps(directory);

function validDraft(): AiDraft {
  return {
    projects: [
      {
        name: "UrbanCart Website",
        clientName: "UrbanCart Clothing",
        description: "Web storefront",
        managerId: "PM01",
        deadline: "2026-10-20",
        tasks: [
          {
            title: "Product catalog UI",
            description: "Build catalog",
            assigneeId: "DEV01",
            deadline: "2026-10-12",
            estimatedHours: 12,
          },
        ],
      },
    ],
  };
}

describe("validateDraft", () => {
  test("valid draft passes", () => {
    const result = validateDraft(validDraft(), maps);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0]?.managerId).toBe("m1");
    expect(result.resolved[0]?.tasks[0]?.assigneeId).toBe("a1");
  });

  test("resolves manager/assignee by ObjectId as well as code", () => {
    const draft = validDraft();
    draft.projects![0]!.managerId = "m1";
    draft.projects![0]!.tasks![0]!.assigneeId = "a1";
    const result = validateDraft(draft, maps);
    expect(result.valid).toBe(true);
  });

  test("ASSIGNEE_NOT_FOUND for unknown person Kamran", () => {
    const draft = validDraft();
    draft.projects![0]!.tasks![0]!.assigneeId = "Kamran";
    const result = validateDraft(draft, maps);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "ASSIGNEE_NOT_FOUND")).toBe(true);
  });

  test("ASSIGNEE_NOT_FOUND when assignee is a MANAGER", () => {
    const draft = validDraft();
    draft.projects![0]!.tasks![0]!.assigneeId = "PM01";
    const result = validateDraft(draft, maps);
    expect(result.issues.some((i) => i.code === "ASSIGNEE_NOT_FOUND")).toBe(true);
  });

  test("MANAGER_NOT_FOUND when manager is an AGENT", () => {
    const draft = validDraft();
    draft.projects![0]!.managerId = "DEV01";
    const result = validateDraft(draft, maps);
    expect(result.issues.some((i) => i.code === "MANAGER_NOT_FOUND")).toBe(true);
  });

  test("INVALID_HOURS when hours <= 0", () => {
    const draft = validDraft();
    draft.projects![0]!.tasks![0]!.estimatedHours = 0;
    const result = validateDraft(draft, maps);
    expect(result.issues.some((i) => i.code === "INVALID_HOURS")).toBe(true);
  });

  test("TASK_AFTER_PROJECT_DEADLINE", () => {
    const draft = validDraft();
    draft.projects![0]!.tasks![0]!.deadline = "2026-10-25";
    const result = validateDraft(draft, maps);
    expect(result.issues.some((i) => i.code === "TASK_AFTER_PROJECT_DEADLINE")).toBe(true);
  });

  test("INVALID_DATE for bad date", () => {
    const draft = validDraft();
    draft.projects![0]!.deadline = "2026-13-40";
    const result = validateDraft(draft, maps);
    expect(result.issues.some((i) => i.code === "INVALID_DATE")).toBe(true);
  });

  test("MISSING_FIELD for missing client", () => {
    const draft = validDraft();
    draft.projects![0]!.clientName = "";
    const result = validateDraft(draft, maps);
    expect(result.issues.some((i) => i.code === "MISSING_FIELD" && i.path.includes("clientName"))).toBe(
      true,
    );
  });

  test("DUPLICATE_TASK within project", () => {
    const draft = validDraft();
    draft.projects![0]!.tasks!.push({
      title: "Product catalog UI",
      description: "dup",
      assigneeId: "DEV02",
      deadline: "2026-10-13",
      estimatedHours: 4,
    });
    const result = validateDraft(draft, maps);
    expect(result.issues.some((i) => i.code === "DUPLICATE_TASK")).toBe(true);
  });

  test("NO_TASKS", () => {
    const draft = validDraft();
    draft.projects![0]!.tasks = [];
    const result = validateDraft(draft, maps);
    expect(result.issues.some((i) => i.code === "NO_TASKS")).toBe(true);
  });

  test("NO_PROJECTS", () => {
    const result = validateDraft({ projects: [] }, maps);
    expect(result.issues.some((i) => i.code === "NO_PROJECTS")).toBe(true);
  });

  test("collects all issues instead of stopping early", () => {
    const draft = validDraft();
    draft.projects![0]!.clientName = null;
    draft.projects![0]!.tasks![0]!.assigneeId = "Kamran";
    draft.projects![0]!.tasks![0]!.estimatedHours = -1;
    const result = validateDraft(draft, maps);
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });
});
