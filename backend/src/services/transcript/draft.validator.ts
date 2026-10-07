import { isValidIsoDate } from "../../schemas/common.schema";
import type { AiDraft } from "../../schemas/transcript.schema";
import type { UserRole } from "../../types/user";
import type { DraftIssue } from "../../types/transcript-run";

export type DirectoryUser = {
  id: string;
  code: string;
  name: string;
  role: UserRole;
};

export type ResolvedTask = {
  title: string;
  description: string;
  assigneeId: string;
  assigneeCode: string;
  assigneeName: string;
  deadline: string;
  estimatedHours: number;
};

export type ResolvedProject = {
  name: string;
  clientName: string;
  description: string;
  managerId: string;
  managerCode: string;
  managerName: string;
  deadline: string;
  tasks: ResolvedTask[];
};

export type ValidateDraftResult = {
  valid: boolean;
  issues: DraftIssue[];
  resolved: ResolvedProject[];
};

export type DirectoryMaps = {
  byCode: Map<string, DirectoryUser>;
  byId: Map<string, DirectoryUser>;
};

function resolveUser(
  value: string | null | undefined,
  maps: DirectoryMaps,
): DirectoryUser | null {
  if (!value) return null;
  const trimmed = value.trim();
  return maps.byCode.get(trimmed.toUpperCase()) ?? maps.byId.get(trimmed) ?? null;
}

function issue(
  path: string,
  code: string,
  message: string,
  value?: unknown,
): DraftIssue {
  return { path, code, message, value };
}

export function validateDraft(draft: AiDraft, maps: DirectoryMaps): ValidateDraftResult {
  const issues: DraftIssue[] = [];
  const resolved: ResolvedProject[] = [];
  const projects = draft.projects ?? [];

  if (!Array.isArray(projects) || projects.length === 0) {
    issues.push(issue("projects", "NO_PROJECTS", "At least one project is required"));
    return { valid: false, issues, resolved };
  }

  projects.forEach((project, pIndex) => {
    const base = `projects[${pIndex}]`;
    const resolvedProject: ResolvedProject = {
      name: "",
      clientName: "",
      description: "",
      managerId: "",
      managerCode: "",
      managerName: "",
      deadline: "",
      tasks: [],
    };

    const name = typeof project.name === "string" ? project.name.trim() : "";
    if (!name) {
      issues.push(issue(`${base}.name`, "MISSING_FIELD", "Project name is required", project.name));
    } else {
      resolvedProject.name = name;
    }

    const clientName = typeof project.clientName === "string" ? project.clientName.trim() : "";
    if (!clientName) {
      issues.push(
        issue(`${base}.clientName`, "MISSING_FIELD", "Client name is required", project.clientName),
      );
    } else {
      resolvedProject.clientName = clientName;
    }

    resolvedProject.description =
      typeof project.description === "string" ? project.description.trim() : "";

    const manager = resolveUser(project.managerId ?? null, maps);
    if (!manager || manager.role !== "MANAGER") {
      issues.push(
        issue(
          `${base}.managerId`,
          "MANAGER_NOT_FOUND",
          `Manager '${project.managerId ?? ""}' is not an existing manager`,
          project.managerId,
        ),
      );
    } else {
      resolvedProject.managerId = manager.id;
      resolvedProject.managerCode = manager.code;
      resolvedProject.managerName = manager.name;
    }

    const deadline = typeof project.deadline === "string" ? project.deadline.trim() : "";
    if (!deadline || !isValidIsoDate(deadline)) {
      issues.push(
        issue(`${base}.deadline`, "INVALID_DATE", "Project deadline must be YYYY-MM-DD", project.deadline),
      );
    } else {
      resolvedProject.deadline = deadline;
    }

    const tasks = project.tasks ?? [];
    if (!Array.isArray(tasks) || tasks.length === 0) {
      issues.push(issue(`${base}.tasks`, "NO_TASKS", "Project must have at least one task"));
    }

    const seenTitles = new Set<string>();
    tasks.forEach((task, tIndex) => {
      const tBase = `${base}.tasks[${tIndex}]`;
      const resolvedTask: ResolvedTask = {
        title: "",
        description: "",
        assigneeId: "",
        assigneeCode: "",
        assigneeName: "",
        deadline: "",
        estimatedHours: 0,
      };

      const title = typeof task.title === "string" ? task.title.trim() : "";
      if (!title) {
        issues.push(issue(`${tBase}.title`, "MISSING_FIELD", "Task title is required", task.title));
      } else {
        const key = title.toLowerCase();
        if (seenTitles.has(key)) {
          issues.push(issue(`${tBase}.title`, "DUPLICATE_TASK", `Duplicate task title '${title}'`, title));
        }
        seenTitles.add(key);
        resolvedTask.title = title;
      }

      resolvedTask.description =
        typeof task.description === "string" ? task.description.trim() : "";

      const assignee = resolveUser(task.assigneeId ?? null, maps);
      if (!assignee || assignee.role !== "AGENT") {
        issues.push(
          issue(
            `${tBase}.assigneeId`,
            "ASSIGNEE_NOT_FOUND",
            `Assignee '${task.assigneeId ?? ""}' is not an existing agent`,
            task.assigneeId,
          ),
        );
      } else {
        resolvedTask.assigneeId = assignee.id;
        resolvedTask.assigneeCode = assignee.code;
        resolvedTask.assigneeName = assignee.name;
      }

      const hours = task.estimatedHours;
      if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) {
        issues.push(
          issue(`${tBase}.estimatedHours`, "INVALID_HOURS", "estimatedHours must be a number > 0", hours),
        );
      } else {
        resolvedTask.estimatedHours = hours;
      }

      const taskDeadline = typeof task.deadline === "string" ? task.deadline.trim() : "";
      if (!taskDeadline || !isValidIsoDate(taskDeadline)) {
        issues.push(
          issue(`${tBase}.deadline`, "INVALID_DATE", "Task deadline must be YYYY-MM-DD", task.deadline),
        );
      } else {
        resolvedTask.deadline = taskDeadline;
        if (resolvedProject.deadline && taskDeadline > resolvedProject.deadline) {
          issues.push(
            issue(
              `${tBase}.deadline`,
              "TASK_AFTER_PROJECT_DEADLINE",
              `Task deadline ${taskDeadline} is after project deadline ${resolvedProject.deadline}`,
              taskDeadline,
            ),
          );
        }
      }

      resolvedProject.tasks.push(resolvedTask);
    });

    resolved.push(resolvedProject);
  });

  return {
    valid: issues.length === 0,
    issues,
    resolved,
  };
}

export function buildDirectoryMaps(users: DirectoryUser[]): DirectoryMaps {
  const byCode = new Map<string, DirectoryUser>();
  const byId = new Map<string, DirectoryUser>();
  for (const u of users) {
    byCode.set(u.code.toUpperCase(), u);
    byId.set(u.id, u);
  }
  return { byCode, byId };
}
