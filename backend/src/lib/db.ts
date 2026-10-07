import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "./logger";

export async function connectDatabase() {
  await mongoose.connect(env.MONGO_URI);
  logger.info("MongoDB connected");
}
