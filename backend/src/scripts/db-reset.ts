import mongoose from "mongoose";
import { env } from "../config/env";
import { ProjectModel } from "../models/project.model";
import { TaskModel } from "../models/task.model";
import { TranscriptRunModel } from "../models/transcript-run.model";

async function reset() {
  await mongoose.connect(env.MONGO_URI);

  const [projects, tasks, runs] = await Promise.all([
    ProjectModel.deleteMany({}),
    TaskModel.deleteMany({}),
    TranscriptRunModel.deleteMany({}),
  ]);

  console.log(
    `Reset complete. projects=${projects.deletedCount} tasks=${tasks.deletedCount} runs=${runs.deletedCount}. Users kept.`,
  );

  await mongoose.disconnect();
  process.exit(0);
}

reset().catch(async (error) => {
  console.error("Reset failed:", error instanceof Error ? error.message : error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
