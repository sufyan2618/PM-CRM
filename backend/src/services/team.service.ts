import mongoose from "mongoose";
import { ProjectModel } from "../models/project.model";
import { taskRepository } from "../repositories/task.repository";
import { userRepository } from "../repositories/user.repository";
import type { UserRole } from "../types/user";
import { toTeamMemberDto } from "../utils/dto";
import type { ScopeUser } from "./scope.service";

/**
 * Admins see everyone. Managers see themselves plus the developers working on
 * their projects. Developers see themselves, the managers of their projects and
 * the other developers on those projects.
 */
async function visibleUserIds(user: ScopeUser): Promise<Set<string>> {
  const ids = new Set<string>([user.userId]);
  const oid = new mongoose.Types.ObjectId(user.userId);

  if (user.role === "MANAGER") {
    const projects = await ProjectModel.find({ managerId: oid }).select("_id").lean();
    const tasks = await taskRepository.find({ projectId: { $in: projects.map((p) => p._id) } });
    tasks.forEach((t) => ids.add(t.assigneeId.toString()));
    return ids;
  }

  const myTasks = await taskRepository.find({ assigneeId: oid });
  const projectIds = [...new Set(myTasks.map((t) => t.projectId.toString()))];
  if (!projectIds.length) return ids;

  const projects = await ProjectModel.find({ _id: { $in: projectIds } }).select("managerId").lean();
  projects.forEach((p) => ids.add(p.managerId.toString()));
  const teamTasks = await taskRepository.find({ projectId: { $in: projectIds } });
  teamTasks.forEach((t) => ids.add(t.assigneeId.toString()));
  return ids;
}

export async function listTeam(user: ScopeUser, role?: UserRole) {
  const users = await userRepository.listDirectory(role);
  if (user.role === "ADMIN") return users.map(toTeamMemberDto);
  const allowed = await visibleUserIds(user);
  return users.filter((u) => allowed.has(u._id.toString())).map(toTeamMemberDto);
}
