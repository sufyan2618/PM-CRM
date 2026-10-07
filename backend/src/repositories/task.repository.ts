import mongoose, { type ClientSession, type FilterQuery } from "mongoose";
import { TaskModel } from "../models/task.model";
import type { ITask } from "../types/task";

export type LeanTask = {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  assigneeId: mongoose.Types.ObjectId;
  deadline: string;
  estimatedHours: number;
  createdAt: Date;
  updatedAt: Date;
};

export const taskRepository = {
  async findById(id: string): Promise<LeanTask | null> {
    return TaskModel.findById(id).lean<LeanTask>();
  },

  async find(filter: FilterQuery<ITask>, options?: { sort?: Record<string, 1 | -1> }): Promise<LeanTask[]> {
    let query = TaskModel.find(filter);
    if (options?.sort) query = query.sort(options.sort);
    return query.lean<LeanTask[]>();
  },

  async findByProjectId(projectId: string, extraFilter: FilterQuery<ITask> = {}): Promise<LeanTask[]> {
    return TaskModel.find({ projectId, ...extraFilter }).lean<LeanTask[]>();
  },

  async insertMany(
    docs: Array<{
      _id: mongoose.Types.ObjectId;
      projectId: mongoose.Types.ObjectId;
      title: string;
      description: string;
      assigneeId: mongoose.Types.ObjectId;
      deadline: string;
      estimatedHours: number;
    }>,
    session?: ClientSession,
  ) {
    return TaskModel.insertMany(docs, { session, ordered: true });
  },

  async updateById(
    id: string,
    update: Partial<Pick<ITask, "title" | "description" | "assigneeId" | "deadline" | "estimatedHours">>,
  ): Promise<LeanTask | null> {
    return TaskModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean<LeanTask>();
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await TaskModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  },

  async deleteByProjectId(projectId: string, session?: ClientSession) {
    return TaskModel.deleteMany({ projectId }).session(session ?? null);
  },

  async deleteByIds(ids: mongoose.Types.ObjectId[], session?: ClientSession) {
    return TaskModel.deleteMany({ _id: { $in: ids } }).session(session ?? null);
  },

  async countDocuments(filter: FilterQuery<ITask> = {}) {
    return TaskModel.countDocuments(filter);
  },

  async sumEstimatedHours(filter: FilterQuery<ITask> = {}) {
    const result = await TaskModel.aggregate<{ total: number }>([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$estimatedHours" } } },
    ]);
    return result[0]?.total ?? 0;
  },

  async maxDeadlineForProject(projectId: string): Promise<string | null> {
    const tasks = await TaskModel.find({ projectId }).select("deadline").lean<{ deadline: string }[]>();
    if (tasks.length === 0) return null;
    return tasks.map((t) => t.deadline).sort().at(-1) ?? null;
  },
};
