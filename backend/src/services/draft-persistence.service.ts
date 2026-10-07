import mongoose from "mongoose";
import { supportsTransactions } from "../lib/db";
import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import { transcriptRunRepository } from "../repositories/transcript-run.repository";
import { HttpError } from "../utils/errors";
import type { ResolvedProject } from "./transcript/draft.validator";

export type SaveDraftResult = {
  projectIds: mongoose.Types.ObjectId[];
  taskIds: mongoose.Types.ObjectId[];
  projects: Array<{
    id: string;
    name: string;
    clientName: string;
    deadline: string;
    manager: { id: string; code: string; name: string };
    taskCount: number;
    totalEstimatedHours: number;
  }>;
};

export async function saveDraft(
  resolved: ResolvedProject[],
  runId: string,
): Promise<SaveDraftResult> {
  const runOid = new mongoose.Types.ObjectId(runId);
  const projectDocs = resolved.map((p) => ({
    _id: new mongoose.Types.ObjectId(),
    name: p.name,
    clientName: p.clientName,
    description: p.description,
    managerId: new mongoose.Types.ObjectId(p.managerId),
    deadline: p.deadline,
    sourceTranscriptRunId: runOid,
  }));

  const taskDocs: Array<{
    _id: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    assigneeId: mongoose.Types.ObjectId;
    deadline: string;
    estimatedHours: number;
  }> = [];

  resolved.forEach((p, index) => {
    const projectId = projectDocs[index]!._id;
    for (const t of p.tasks) {
      taskDocs.push({
        _id: new mongoose.Types.ObjectId(),
        projectId,
        title: t.title,
        description: t.description,
        assigneeId: new mongoose.Types.ObjectId(t.assigneeId),
        deadline: t.deadline,
        estimatedHours: t.estimatedHours,
      });
    }
  });

  try {
    if (supportsTransactions()) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await projectRepository.insertMany(projectDocs, session);
          if (taskDocs.length > 0) {
            await taskRepository.insertMany(taskDocs, session);
          }
          await transcriptRunRepository.updateStatus(
            runId,
            {
              status: "SUCCEEDED",
              createdProjectIds: projectDocs.map((p) => p._id),
              issues: [],
              errorMessage: undefined,
            },
            session,
          );
        });
      } finally {
        await session.endSession();
      }
    } else {
      await projectRepository.insertMany(projectDocs);
      try {
        if (taskDocs.length > 0) {
          await taskRepository.insertMany(taskDocs);
        }
        await transcriptRunRepository.updateStatus(runId, {
          status: "SUCCEEDED",
          createdProjectIds: projectDocs.map((p) => p._id),
          issues: [],
          errorMessage: undefined,
        });
      } catch (innerError) {
        await taskRepository.deleteByIds(taskDocs.map((t) => t._id));
        await projectRepository.deleteByIds(projectDocs.map((p) => p._id));
        throw innerError;
      }
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      500,
      "Failed to save projects and tasks",
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : undefined,
    );
  }

  const projects = resolved.map((p, index) => ({
    id: projectDocs[index]!._id.toString(),
    name: p.name,
    clientName: p.clientName,
    deadline: p.deadline,
    manager: {
      id: p.managerId,
      code: p.managerCode,
      name: p.managerName,
    },
    taskCount: p.tasks.length,
    totalEstimatedHours: p.tasks.reduce((sum, t) => sum + t.estimatedHours, 0),
  }));

  return {
    projectIds: projectDocs.map((p) => p._id),
    taskIds: taskDocs.map((t) => t._id),
    projects,
  };
}
