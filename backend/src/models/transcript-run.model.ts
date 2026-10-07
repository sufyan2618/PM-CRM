import mongoose, { Schema } from "mongoose";
import type { ITranscriptRun } from "../types/transcript-run";

const draftIssueSchema = new Schema(
  {
    path: { type: String, required: true },
    code: { type: String, required: true },
    message: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const transcriptRunSchema = new Schema<ITranscriptRun>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    transcriptHash: { type: String, required: true, index: true },
    transcriptLength: { type: Number, required: true },
    transcript: { type: String, maxlength: 100_000 },
    status: {
      type: String,
      enum: ["PROCESSING", "SUCCEEDED", "FAILED", "NEEDS_CORRECTION"],
      required: true,
      index: true,
    },
    rawModelOutput: { type: String, maxlength: 50_000 },
    draft: { type: Schema.Types.Mixed },
    issues: { type: [draftIssueSchema], default: [] },
    createdProjectIds: { type: [Schema.Types.ObjectId], ref: "Project", default: [] },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

transcriptRunSchema.index(
  { createdBy: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "PROCESSING" },
    name: "unique_processing_per_admin",
  },
);

transcriptRunSchema.set("toJSON", {
  transform(_doc, ret) {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = String(obj._id);
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

export const TranscriptRunModel = mongoose.model<ITranscriptRun>("TranscriptRun", transcriptRunSchema);
