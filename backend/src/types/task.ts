import type { Document, Types } from "mongoose";

export interface ITask extends Document {
  projectId: Types.ObjectId;
  title: string;
  description: string;
  assigneeId: Types.ObjectId;
  deadline: string;
  estimatedHours: number;
  createdAt: Date;
  updatedAt: Date;
}
