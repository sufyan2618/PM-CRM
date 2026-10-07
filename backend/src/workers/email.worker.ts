import { Worker } from "bullmq";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { redis } from "../lib/redis";
import { sendOtpEmail } from "../utils/send-email";

const worker = new Worker(
  "email-queue",
  async (job) => {
    await sendOtpEmail({
      to: job.data.to,
      subject: job.data.subject,
      otp: job.data.otp,
      purpose: job.data.purpose,
    });
  },
  { connection: redis },
);

worker.on("completed", (job) => {
  logger.info(`Email job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  logger.error(`Email job failed: ${job?.id} - ${err.message}`);
});

logger.info(`Email worker running in ${env.NODE_ENV} mode`);
