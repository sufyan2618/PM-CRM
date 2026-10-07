import mongoose from "mongoose";
import type { UserRole } from "../types/user";

export type ScopeUser = {
  userId: string;
  role: UserRole;
  code: string;
};

export type ProjectScopeFilter = {
  projectMatch: Record<string, unknown>;
  taskMatch: Record<string, unknown>;
  /** Agents only see projects that contain at least one of their tasks */
  requireVisibleTask: boolean;
};

export function buildProjectScopeFilter(user: ScopeUser): ProjectScopeFilter {
  if (user.role === "ADMIN") {
    return {
      projectMatch: {},
      taskMatch: {},
      requireVisibleTask: false,
    };
  }

  if (user.role === "MANAGER") {
    return {
      projectMatch: { managerId: new mongoose.Types.ObjectId(user.userId) },
      taskMatch: {},
      requireVisibleTask: false,
    };
  }

  // AGENT
  return {
    projectMatch: {},
    taskMatch: { assigneeId: new mongoose.Types.ObjectId(user.userId) },
    requireVisibleTask: true,
  };
}

export function buildTaskScopeFilter(user: ScopeUser, projectId: string): Record<string, unknown> {
  const oid = new mongoose.Types.ObjectId(projectId);

  if (user.role === "ADMIN") {
    return { projectId: oid };
  }

  if (user.role === "MANAGER") {
    // Manager access to tasks is gated by project ownership checked separately
    return { projectId: oid };
  }

  return {
    projectId: oid,
    assigneeId: new mongoose.Types.ObjectId(user.userId),
  };
}

export function canAccessProjectAsManager(
  user: ScopeUser,
  project: { managerId: { toString(): string } },
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "MANAGER") {
    return project.managerId.toString() === user.userId;
  }
  return false;
}

export function canAccessTask(
  user: ScopeUser,
  task: { assigneeId: { toString(): string }; projectId: { toString(): string } },
  project: { managerId: { toString(): string } } | null,
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "MANAGER") {
    return Boolean(project && project.managerId.toString() === user.userId);
  }
  return task.assigneeId.toString() === user.userId;
}
