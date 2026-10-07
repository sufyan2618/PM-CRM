import mongoose from "mongoose";
import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import { userRepository } from "../repositories/user.repository";
import { HttpError } from "../utils/errors";
import { toAssigneeSummary, toManagerSummary, toMyTaskDto, toTaskDto } from "../utils/dto";
import {
  buildTaskScopeFilter,
  canAccessProjectAsManager,
  canAccessTask,
  type ScopeUser,
} from "./scope.service";

export async function listProjectTasks(user: ScopeUser, projectId: string) {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    throw new HttpError(404, "Project not found", "NOT_FOUND");
  }

  if (user.role === "MANAGER" && !canAccessProjectAsManager(user, project)) {
    throw new HttpError(404, "Project not found", "NOT_FOUND");
  }

  if (user.role === "AGENT") {
    const own = await taskRepository.findByProjectId(projectId, {
      assigneeId: user.userId,
    });
    if (own.length === 0) {
      throw new HttpError(404, "Project not found", "NOT_FOUND");
    }
  }

  const filter = buildTaskScopeFilter(user, projectId);
  const tasks = await taskRepository.find(filter);
  const assigneeIds = [...new Set(tasks.map((t) => t.assigneeId.toString()))];
  const assignees = await userRepository.findManyByIds(assigneeIds);
  const map = new Map(assignees.map((a) => [a._id.toString(), a]));

  return tasks.map((t) => {
    const assignee = map.get(t.assigneeId.toString());
    return toTaskDto(
      t,
      assignee
        ? toAssigneeSummary(assignee)
        : { id: t.assigneeId.toString(), code: "", name: "Unknown" },
    );
  });
}

export async function getMyTasks(user: ScopeUser, projectId?: string) {
  if (user.role !== "AGENT") {
    throw new HttpError(403, "Only agents can access my tasks", "FORBIDDEN");
  }

  const filter: Record<string, unknown> = {
    assigneeId: new mongoose.Types.ObjectId(user.userId),
  };
  if (projectId) {
    filter.projectId = new mongoose.Types.ObjectId(projectId);
  }

  const tasks = await taskRepository.find(filter, { sort: { deadline: 1 } });
  const projectIds = [...new Set(tasks.map((t) => t.projectId.toString()))];
  const projects = await Promise.all(projectIds.map((id) => projectRepository.findById(id)));
  const projectMap = new Map(
    projects.filter(Boolean).map((p) => [p!._id.toString(), p!]),
  );

  const managerIds = [
    ...new Set(
      [...projectMap.values()].map((p) => p.managerId.toString()),
    ),
  ];
  const managers = await userRepository.findManyByIds(managerIds);
  const managerMap = new Map(managers.map((m) => [m._id.toString(), m]));

  return tasks.map((task) => {
    const project = projectMap.get(task.projectId.toString());
    if (!project) {
      return toMyTaskDto(task, {
        id: task.projectId.toString(),
        name: "Unknown",
        clientName: "",
        deadline: "",
        manager: { id: "", code: "", name: "" },
      });
    }
    const manager = managerMap.get(project.managerId.toString());
    return toMyTaskDto(task, {
      id: project._id.toString(),
      name: project.name,
      clientName: project.clientName,
      deadline: project.deadline,
      manager: manager
        ? toManagerSummary(manager)
        : { id: project.managerId.toString(), code: "", name: "" },
    });
  });
}

export async function getTaskById(user: ScopeUser, taskId: string) {
  const task = await taskRepository.findById(taskId);
  if (!task) {
    throw new HttpError(404, "Task not found", "NOT_FOUND");
  }

  const project = await projectRepository.findById(task.projectId.toString());
  if (!canAccessTask(user, task, project)) {
    throw new HttpError(404, "Task not found", "NOT_FOUND");
  }

  const assignee = await userRepository.findById(task.assigneeId.toString());
  return toTaskDto(
    task,
    assignee
      ? toAssigneeSummary(assignee)
      : { id: task.assigneeId.toString(), code: "", name: "Unknown" },
  );
}

export async function updateTask(
  taskId: string,
  body: {
    title?: string;
    description?: string;
    assigneeId?: string;
    deadline?: string;
    estimatedHours?: number;
  },
) {
  const task = await taskRepository.findById(taskId);
  if (!task) {
    throw new HttpError(404, "Task not found", "NOT_FOUND");
  }

  const project = await projectRepository.findById(task.projectId.toString());
  if (!project) {
    throw new HttpError(404, "Task not found", "NOT_FOUND");
  }

  if (body.assigneeId) {
    const assignee = await userRepository.findById(body.assigneeId);
    if (!assignee || assignee.role !== "AGENT") {
      throw new HttpError(400, "assigneeId must reference an existing AGENT", "VALIDATION_ERROR");
    }
  }

  const nextDeadline = body.deadline ?? task.deadline;
  if (nextDeadline > project.deadline) {
    throw new HttpError(
      400,
      `Task deadline cannot be after project deadline (${project.deadline})`,
      "VALIDATION_ERROR",
    );
  }

  if (body.estimatedHours !== undefined && body.estimatedHours <= 0) {
    throw new HttpError(400, "estimatedHours must be greater than 0", "VALIDATION_ERROR");
  }

  const updated = await taskRepository.updateById(taskId, {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.assigneeId !== undefined
      ? { assigneeId: new mongoose.Types.ObjectId(body.assigneeId) }
      : {}),
    ...(body.deadline !== undefined ? { deadline: body.deadline } : {}),
    ...(body.estimatedHours !== undefined ? { estimatedHours: body.estimatedHours } : {}),
  });

  if (!updated) {
    throw new HttpError(404, "Task not found", "NOT_FOUND");
  }

  return getTaskById({ userId: "", role: "ADMIN", code: "ADMIN" }, taskId);
}

export async function deleteTask(taskId: string) {
  const task = await taskRepository.findById(taskId);
  if (!task) {
    throw new HttpError(404, "Task not found", "NOT_FOUND");
  }
  await taskRepository.deleteById(taskId);
  return { id: taskId };
}
