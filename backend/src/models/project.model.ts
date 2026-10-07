import mongoose, { Schema } from "mongoose";
import type { IProject } from "../types/project";

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    clientName: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "", maxlength: 2000 },
    managerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deadline: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    sourceTranscriptRunId: { type: Schema.Types.ObjectId, ref: "TranscriptRun" },
  },
  { timestamps: true },
);

projectSchema.index({ name: 1 });

projectSchema.set("toJSON", {
  transform(_doc, ret) {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = String(obj._id);
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

export const ProjectModel = mongoose.model<IProject>("Project", projectSchema);
