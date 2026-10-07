import { describe, expect, test } from "bun:test";
import {
  buildProjectScopeFilter,
  buildTaskScopeFilter,
  canAccessTask,
} from "../src/services/scope.service";

describe("scope.service", () => {
  test("ADMIN sees all projects and tasks", () => {
    const user = { userId: "admin1", role: "ADMIN" as const, code: "ADMIN" };
    const projectScope = buildProjectScopeFilter(user);
    expect(projectScope.projectMatch).toEqual({});
    expect(projectScope.taskMatch).toEqual({});
    expect(projectScope.requireVisibleTask).toBe(false);

    const taskScope = buildTaskScopeFilter(user, "507f1f77bcf86cd799439011");
    expect(taskScope.projectId).toBeTruthy();
    expect(taskScope.assigneeId).toBeUndefined();
  });

  test("MANAGER only matches own projects", () => {
    const user = { userId: "507f1f77bcf86cd799439011", role: "MANAGER" as const, code: "PM01" };
    const scope = buildProjectScopeFilter(user);
    expect(String(scope.projectMatch.managerId)).toBe(user.userId);
    expect(scope.requireVisibleTask).toBe(false);
  });

  test("AGENT requires visible tasks and filters by assignee", () => {
    const user = { userId: "507f1f77bcf86cd799439012", role: "AGENT" as const, code: "DEV01" };
    const scope = buildProjectScopeFilter(user);
    expect(scope.requireVisibleTask).toBe(true);
    expect(String(scope.taskMatch.assigneeId)).toBe(user.userId);

    const taskScope = buildTaskScopeFilter(user, "507f1f77bcf86cd799439013");
    expect(String(taskScope.assigneeId)).toBe(user.userId);
  });

  test("canAccessTask rules", () => {
    const project = { managerId: { toString: () => "mgr1" } };
    const task = {
      assigneeId: { toString: () => "agent1" },
      projectId: { toString: () => "proj1" },
    };

    expect(
      canAccessTask({ userId: "x", role: "ADMIN", code: "ADMIN" }, task, project),
    ).toBe(true);
    expect(
      canAccessTask({ userId: "mgr1", role: "MANAGER", code: "PM01" }, task, project),
    ).toBe(true);
    expect(
      canAccessTask({ userId: "mgr2", role: "MANAGER", code: "PM02" }, task, project),
    ).toBe(false);
    expect(
      canAccessTask({ userId: "agent1", role: "AGENT", code: "DEV01" }, task, project),
    ).toBe(true);
    expect(
      canAccessTask({ userId: "agent2", role: "AGENT", code: "DEV02" }, task, project),
    ).toBe(false);
  });
});
