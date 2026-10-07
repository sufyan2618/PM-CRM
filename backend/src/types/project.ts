import type { Document, Types } from "mongoose";

export interface IProject extends Document {
  name: string;
  clientName: string;
  description: string;
  managerId: Types.ObjectId;
  deadline: string;
  sourceTranscriptRunId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
