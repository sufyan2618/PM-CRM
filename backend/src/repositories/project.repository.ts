import mongoose, { type ClientSession, type PipelineStage } from "mongoose";
import { ProjectModel } from "../models/project.model";
import type { IProject } from "../types/project";

export type LeanProject = {
  _id: mongoose.Types.ObjectId;
  name: string;
  clientName: string;
  description: string;
  managerId: mongoose.Types.ObjectId;
  deadline: string;
  sourceTranscriptRunId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const projectRepository = {
  async findById(id: string, session?: ClientSession): Promise<LeanProject | null> {
    return ProjectModel.findById(id)
      .session(session ?? null)
      .lean<LeanProject>();
  },

  async aggregate<T = unknown>(pipeline: PipelineStage[]): Promise<T[]> {
    return ProjectModel.aggregate(pipeline);
  },

  async insertMany(
    docs: Array<{
      _id: mongoose.Types.ObjectId;
      name: string;
      clientName: string;
      description: string;
      managerId: mongoose.Types.ObjectId;
      deadline: string;
      sourceTranscriptRunId?: mongoose.Types.ObjectId;
    }>,
    session?: ClientSession,
  ) {
    return ProjectModel.insertMany(docs, { session, ordered: true });
  },

  async updateById(
    id: string,
    update: Partial<Pick<IProject, "name" | "clientName" | "description" | "managerId" | "deadline">>,
  ): Promise<LeanProject | null> {
    return ProjectModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean<LeanProject>();
  },

  async deleteById(id: string, session?: ClientSession): Promise<boolean> {
    const result = await ProjectModel.deleteOne({ _id: id }).session(session ?? null);
    return result.deletedCount === 1;
  },

  async deleteByIds(ids: mongoose.Types.ObjectId[], session?: ClientSession) {
    return ProjectModel.deleteMany({ _id: { $in: ids } }).session(session ?? null);
  },

  async countDocuments(filter: Record<string, unknown> = {}) {
    return ProjectModel.countDocuments(filter);
  },
};
