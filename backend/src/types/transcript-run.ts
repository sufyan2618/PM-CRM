import type { Document, Types } from "mongoose";

export type TranscriptRunStatus = "PROCESSING" | "SUCCEEDED" | "FAILED" | "NEEDS_CORRECTION";

export interface DraftIssue {
  path: string;
  code: string;
  message: string;
  value?: unknown;
}

export interface ITranscriptRun extends Document {
  createdBy: Types.ObjectId;
  transcriptHash: string;
  transcriptLength: number;
  transcript?: string;
  status: TranscriptRunStatus;
  rawModelOutput?: string;
  draft?: unknown;
  issues?: DraftIssue[];
  createdProjectIds: Types.ObjectId[];
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
