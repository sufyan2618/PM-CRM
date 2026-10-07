import mongoose, { type ClientSession } from "mongoose";
import { TranscriptRunModel } from "../models/transcript-run.model";
import type { DraftIssue, ITranscriptRun, TranscriptRunStatus } from "../types/transcript-run";

export type LeanTranscriptRun = {
  _id: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  transcriptHash: string;
  transcriptLength: number;
  transcript?: string;
  status: TranscriptRunStatus;
  rawModelOutput?: string;
  draft?: unknown;
  issues?: DraftIssue[];
  createdProjectIds: mongoose.Types.ObjectId[];
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const transcriptRunRepository = {
  async findById(id: string): Promise<LeanTranscriptRun | null> {
    return TranscriptRunModel.findById(id).lean<LeanTranscriptRun>();
  },

  async findSucceededByHash(hash: string): Promise<LeanTranscriptRun | null> {
    return TranscriptRunModel.findOne({ transcriptHash: hash, status: "SUCCEEDED" }).lean<LeanTranscriptRun>();
  },

  async findProcessingByAdmin(adminId: string): Promise<LeanTranscriptRun | null> {
    return TranscriptRunModel.findOne({
      createdBy: adminId,
      status: "PROCESSING",
    }).lean<LeanTranscriptRun>();
  },

  async markStaleProcessing(olderThan: Date) {
    return TranscriptRunModel.updateMany(
      { status: "PROCESSING", createdAt: { $lt: olderThan } },
      {
        $set: {
          status: "FAILED",
          errorMessage: "Conversion timed out / stale lock cleared",
        },
      },
    );
  },

  async createProcessing(data: {
    createdBy: string;
    transcriptHash: string;
    transcriptLength: number;
    transcript?: string;
  }): Promise<LeanTranscriptRun> {
    const doc = await TranscriptRunModel.create({
      createdBy: data.createdBy,
      transcriptHash: data.transcriptHash,
      transcriptLength: data.transcriptLength,
      transcript: data.transcript,
      status: "PROCESSING",
      createdProjectIds: [],
      issues: [],
    });
    return doc.toObject() as LeanTranscriptRun;
  },

  async updateStatus(
    id: string,
    update: {
      status: TranscriptRunStatus;
      rawModelOutput?: string;
      draft?: unknown;
      issues?: DraftIssue[];
      createdProjectIds?: mongoose.Types.ObjectId[];
      errorMessage?: string;
    },
    session?: ClientSession,
  ) {
    return TranscriptRunModel.findByIdAndUpdate(id, { $set: update }, { new: true, session }).lean<LeanTranscriptRun>();
  },

  async listRecent(limit = 20): Promise<LeanTranscriptRun[]> {
    return TranscriptRunModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<LeanTranscriptRun[]>();
  },

  async deleteAll() {
    return TranscriptRunModel.deleteMany({});
  },
};

export type { ITranscriptRun };
