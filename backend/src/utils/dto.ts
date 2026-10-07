import { displayName } from "../types/user";
import type { LeanUser } from "../repositories/user.repository";
import type { LeanProject } from "../repositories/project.repository";
import type { LeanTask } from "../repositories/task.repository";

export function toUserDto(user: LeanUser) {
  return {
    id: user._id.toString(),
    code: user.code,
    name: displayName(user),
    email: user.email,
    role: user.role,
    specialization: user.specialization,
    skills: user.skills ?? [],
  };
}

export function toTeamMemberDto(user: LeanUser) {
  return {
    id: user._id.toString(),
    code: user.code,
    name: displayName(user),
    role: user.role,
    specialization: user.specialization,
    skills: user.skills ?? [],
  };
}

export function toManagerSummary(
  user: Pick<LeanUser, "_id" | "code" | "firstName" | "lastName"> & { specialization?: string },
  includeSpecialization = false,
) {
  const base = {
    id: user._id.toString(),
    code: user.code,
    name: displayName(user),
  };
  if (includeSpecialization) {
    return { ...base, specialization: user.specialization ?? "" };
  }
  return base;
}

export function toAssigneeSummary(user: Pick<LeanUser, "_id" | "code" | "firstName" | "lastName">) {
  return {
    id: user._id.toString(),
    code: user.code,
    name: displayName(user),
  };
}

export function toProjectCardDto(input: {
  project: LeanProject | (Omit<LeanProject, "_id"> & { _id: { toString(): string } });
  manager: { id: string; code: string; name: string };
  taskCount: number;
  totalEstimatedHours: number;
}) {
  return {
    id: input.project._id.toString(),
    name: input.project.name,
    clientName: input.project.clientName,
    description: input.project.description,
    deadline: input.project.deadline,
    manager: input.manager,
    taskCount: input.taskCount,
    totalEstimatedHours: input.totalEstimatedHours,
    createdAt: input.project.createdAt,
  };
}

export function toTaskDto(
  task: LeanTask,
  assignee: { id: string; code: string; name: string },
) {
  return {
    id: task._id.toString(),
    projectId: task.projectId.toString(),
    title: task.title,
    description: task.description,
    assignee,
    deadline: task.deadline,
    estimatedHours: task.estimatedHours,
  };
}

export function toMyTaskDto(
  task: LeanTask,
  project: {
    id: string;
    name: string;
    clientName: string;
    deadline: string;
    manager: { id: string; code: string; name: string };
  },
) {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    deadline: task.deadline,
    estimatedHours: task.estimatedHours,
    project,
  };
}
