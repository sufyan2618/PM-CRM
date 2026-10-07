import mongoose, { type PipelineStage } from "mongoose";
import { supportsTransactions } from "../lib/db";
import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import { userRepository } from "../repositories/user.repository";
import { HttpError } from "../utils/errors";
import { toAssigneeSummary, toManagerSummary, toTaskDto } from "../utils/dto";
import { buildProjectScopeFilter, type ScopeUser } from "./scope.service";

type ListQuery = {
  page: number;
  limit: number;
  search?: string;
};

export async function listProjects(user: ScopeUser, query: ListQuery) {
  const scope = buildProjectScopeFilter(user);
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const match: Record<string, unknown> = { ...scope.projectMatch };
  if (query.search?.trim()) {
    const regex = { $regex: query.search.trim(), $options: "i" };
    match.$or = [{ name: regex }, { clientName: regex }];
  }

  const taskMatchExpr: Record<string, unknown>[] = [
    { $eq: ["$projectId", "$$projectId"] },
  ];
  if (scope.taskMatch.assigneeId) {
    taskMatchExpr.push({ $eq: ["$assigneeId", scope.taskMatch.assigneeId] });
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: "tasks",
        let: { projectId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: taskMatchExpr } } },
          {
            $group: {
              _id: null,
              taskCount: { $sum: 1 },
              totalEstimatedHours: { $sum: "$estimatedHours" },
            },
          },
        ],
        as: "taskStats",
      },
    },
    {
      $addFields: {
        taskCount: { $ifNull: [{ $arrayElemAt: ["$taskStats.taskCount", 0] }, 0] },
        totalEstimatedHours: {
          $ifNull: [{ $arrayElemAt: ["$taskStats.totalEstimatedHours", 0] }, 0],
        },
      },
    },
  ];

  if (scope.requireVisibleTask) {
    pipeline.push({ $match: { taskCount: { $gt: 0 } } });
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "managerId",
        foreignField: "_id",
        as: "managerDoc",
      },
    },
    { $unwind: { path: "$managerDoc", preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  );

  const result = await projectRepository.aggregate<{
    items: Array<{
      _id: mongoose.Types.ObjectId;
      name: string;
      clientName: string;
      description: string;
      deadline: string;
      createdAt: Date;
      taskCount: number;
      totalEstimatedHours: number;
      managerDoc?: {
        _id: mongoose.Types.ObjectId;
        code: string;
        firstName: string;
        lastName: string;
      };
    }>;
    total: Array<{ count: number }>;
  }>(pipeline);

  const facet = result[0];
  const total = facet?.total[0]?.count ?? 0;
  const items = (facet?.items ?? []).map((p) => ({
    id: p._id.toString(),
    name: p.name,
    clientName: p.clientName,
    description: p.description,
    deadline: p.deadline,
    manager: p.managerDoc
      ? toManagerSummary(p.managerDoc)
      : { id: "", code: "", name: "" },
    taskCount: p.taskCount,
    totalEstimatedHours: p.totalEstimatedHours,
    createdAt: p.createdAt,
  }));

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getProjectById(user: ScopeUser, projectId: string) {
  const scope = buildProjectScopeFilter(user);
  const project = await projectRepository.findById(projectId);
  if (!project) {
    throw new HttpError(404, "Project not found", "NOT_FOUND");
  }

  if (scope.projectMatch.managerId) {
    if (project.managerId.toString() !== user.userId) {
      throw new HttpError(404, "Project not found", "NOT_FOUND");
    }
  }

  const taskFilter: Record<string, unknown> = { projectId };
  if (scope.taskMatch.assigneeId) {
    taskFilter.assigneeId = scope.taskMatch.assigneeId;
  }

  const tasks = await taskRepository.findByProjectId(projectId, taskFilter);

  if (scope.requireVisibleTask && tasks.length === 0) {
    throw new HttpError(404, "Project not found", "NOT_FOUND");
  }

  const manager = await userRepository.findById(project.managerId.toString());
  if (!manager) {
    throw new HttpError(404, "Project not found", "NOT_FOUND");
  }

  const assigneeIds = [...new Set(tasks.map((t) => t.assigneeId.toString()))];
  const assignees = await userRepository.findManyByIds(assigneeIds);
  const assigneeMap = new Map(assignees.map((a) => [a._id.toString(), a]));

  const taskDtos = tasks.map((t) => {
    const assignee = assigneeMap.get(t.assigneeId.toString());
    return toTaskDto(
      t,
      assignee
        ? toAssigneeSummary(assignee)
        : { id: t.assigneeId.toString(), code: "", name: "Unknown" },
    );
  });

  const totalEstimatedHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  return {
    id: project._id.toString(),
    name: project.name,
    clientName: project.clientName,
    description: project.description,
    deadline: project.deadline,
    manager: toManagerSummary(manager, true),
    tasks: taskDtos,
    taskCount: tasks.length,
    totalEstimatedHours,
  };
}

export async function updateProject(
  projectId: string,
  body: {
    name?: string;
    clientName?: string;
    description?: string;
    managerId?: string;
    deadline?: string;
  },
) {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    throw new HttpError(404, "Project not found", "NOT_FOUND");
  }

  if (body.managerId) {
    const manager = await userRepository.findById(body.managerId);
    if (!manager || manager.role !== "MANAGER") {
      throw new HttpError(400, "managerId must reference an existing MANAGER", "VALIDATION_ERROR");
    }
  }

  if (body.deadline) {
    const maxTaskDeadline = await taskRepository.maxDeadlineForProject(projectId);
    if (maxTaskDeadline && body.deadline < maxTaskDeadline) {
      throw new HttpError(
        400,
        `Project deadline cannot be earlier than latest task deadline (${maxTaskDeadline})`,
        "VALIDATION_ERROR",
      );
    }
  }

  const updated = await projectRepository.updateById(projectId, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.clientName !== undefined ? { clientName: body.clientName } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.managerId !== undefined
      ? { managerId: new mongoose.Types.ObjectId(body.managerId) }
      : {}),
    ...(body.deadline !== undefined ? { deadline: body.deadline } : {}),
  });

  if (!updated) {
    throw new HttpError(404, "Project not found", "NOT_FOUND");
  }

  return getProjectById({ userId: "", role: "ADMIN", code: "ADMIN" }, projectId);
}

export async function deleteProject(projectId: string) {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    throw new HttpError(404, "Project not found", "NOT_FOUND");
  }

  if (supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await taskRepository.deleteByProjectId(projectId, session);
        await projectRepository.deleteById(projectId, session);
      });
    } finally {
      await session.endSession();
    }
  } else {
    await taskRepository.deleteByProjectId(projectId);
    await projectRepository.deleteById(projectId);
  }

  return { id: projectId };
}
