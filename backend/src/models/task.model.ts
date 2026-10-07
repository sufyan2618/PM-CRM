import mongoose, { Schema } from "mongoose";
import type { ITask } from "../types/task";

const taskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "", maxlength: 2000 },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deadline: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    estimatedHours: {
      type: Number,
      required: true,
      min: 0.01,
      max: 1000,
    },
  },
  { timestamps: true },
);

taskSchema.index({ projectId: 1, assigneeId: 1 });

taskSchema.set("toJSON", {
  transform(_doc, ret) {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = String(obj._id);
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

export const TaskModel = mongoose.model<ITask>("Task", taskSchema);
