import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export interface EmailJobData {
  to: string;
  subject: string;
  otp: string;
  purpose: "verify_email" | "reset_password";
}

export const emailQueue = new Queue<EmailJobData>("email-queue", {
  connection: redis,
});

export async function addOtpEmailJob(data: EmailJobData) {
  await emailQueue.add("send-otp-email", data, {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });
}
