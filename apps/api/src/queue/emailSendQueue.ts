import { Queue } from "bullmq";
import { EMAIL_SEND_QUEUE, type EmailSendJobData } from "@ejs/shared";
import { createRedisConnection } from "../lib/redis";

export const emailSendQueue = new Queue<EmailSendJobData>(EMAIL_SEND_QUEUE, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 60 * 60 * 24 * 7 }, // keep 7 days for Bull Board visibility
    removeOnFail: { age: 60 * 60 * 24 * 30 },
  },
});
