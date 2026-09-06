import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { EMAIL_SEND_QUEUE, type EmailSendJobData } from "@ejs/shared";
import { createRedisConnection, redis } from "../lib/redis";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { emailSendQueue } from "../queue/emailSendQueue";
import { RateLimiter } from "../services/rateLimiter";
import { getEmailProvider } from "../services/emailProviderFactory";
import { indexEmailDoc } from "../services/searchService";
import { sendRateLimitSlackNotification } from "../services/slackService";
import { slackNotifyDedupeKey } from "@ejs/shared";

const rateLimiter = new RateLimiter(redis);

async function processEmailJob(job: Job<EmailSendJobData>): Promise<void> {
  const { emailJobId } = job.data;

  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { sender: true, campaign: true, user: true },
  });

  if (!emailJob) {
    // Row was deleted (e.g. campaign removed) -- nothing to do, and not an error.
    return;
  }

  // --- Idempotency guard #1: already terminal, never resend. ---
  if (emailJob.status === "SENT") {
    return;
  }

  // --- Hourly rate limit (atomic, cross-process) ---
  const limit = emailJob.sender.maxPerHour ?? emailJob.campaign.hourlyLimit ?? env.DEFAULT_MAX_EMAILS_PER_HOUR;
  const reservation = await rateLimiter.tryReserveHourlyCapacity(emailJob.senderId, limit);

  if (!reservation.allowed) {
    // Do NOT drop the email. Reschedule to the next window and requeue with
    // the SAME deterministic job id -- BullMQ treats this as updating/
    // replacing the existing job's delay rather than creating a duplicate,
    // because a job with that id already completed its (failed) attempt.
    // We instead add a *new* delayed job for the same EmailJob row and rely
    // on the DB status transition + a fresh bullJobId to track it, since a
    // just-processed BullMQ job id cannot be reused for a future delay.
    const rescheduledAt = reservation.nextWindowStart;

    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { status: "RATE_LIMITED", scheduledAt: rescheduledAt },
    });

    const newJobId = `${emailJob.idempotencyKey}:retry:${reservation.hourWindow}`;
    await emailSendQueue.add(
      "send",
      { emailJobId: emailJob.id, senderId: emailJob.senderId, campaignId: emailJob.campaignId },
      { jobId: newJobId, delay: Math.max(0, rescheduledAt.getTime() - Date.now()) }
    );

    // Deduped Slack notification: at most one per sender per hour window.
    const dedupeKey = slackNotifyDedupeKey(emailJob.senderId, reservation.hourWindow);
    const firstNotification = await redis.set(dedupeKey, "1", "EX", 3600, "NX");
    if (firstNotification === "OK") {
      await sendRateLimitSlackNotification({
        userId: emailJob.userId,
        senderEmail: emailJob.sender.email,
        hourlyLimit: limit,
      });
    }

    return;
  }

  // --- Minimum delay between sends for this sender (cross-process lock) ---
  const gotSlot = await rateLimiter.tryAcquireMinDelaySlot(emailJob.senderId, emailJob.campaign.delayMs);
  if (!gotSlot) {
    // Someone else is within the min-delay window for this sender. Release
    // the hourly reservation we just took (we haven't sent anything) and
    // retry shortly -- BullMQ's built-in backoff/attempts handles this via
    // a thrown error, which is cheap since it's a short local retry, not a
    // full hour-long reschedule.
    await rateLimiter.releaseHourlyCapacity(emailJob.senderId);
    throw new Error("MIN_SEND_DELAY_MS window occupied for this sender, will retry");
  }

  // --- Idempotency guard #2: atomic conditional transition. ---
  // Only one worker can win this update; if 0 rows are affected, another
  // worker (or a previous attempt after a crash) already claimed it.
  const claim = await prisma.emailJob.updateMany({
    where: { id: emailJob.id, status: { in: ["SCHEDULED", "QUEUED", "RATE_LIMITED"] } },
    data: { status: "SENDING" },
  });
  if (claim.count === 0) {
    await rateLimiter.releaseHourlyCapacity(emailJob.senderId);
    return; // Someone else is handling (or already handled) this job.
  }

  try {
    const provider = getEmailProvider();
    const result = await provider.send({
      fromEmail: emailJob.sender.email,
      to: emailJob.recipient,
      subject: emailJob.subject,
      html: emailJob.body,
    });

    // NOTE (documented limitation, see README "Idempotency strategy"): if the
    // process crashes between provider.send() succeeding and this DB write,
    // the message has genuinely been sent but our DB will still show
    // "SENDING". A reconciliation sweep (see worker/reconciler.ts) detects
    // stuck SENDING rows and, for providers with idempotent message IDs,
    // could verify delivery before deciding whether to resend. Ethereal/plain
    // SMTP gives no such verification hook, so this implementation cannot
    // claim mathematically perfect exactly-once delivery -- only "won't
    // resend on ordinary retries/restarts", which is what we guarantee.
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        attempts: { increment: 1 },
        failureReason: null,
      },
    });

    await indexEmailDoc({
      emailJobId: emailJob.id,
      recipient: emailJob.recipient,
      subject: emailJob.subject,
      status: "SENT",
      scheduledAt: emailJob.scheduledAt.toISOString(),
      sentAt: new Date().toISOString(),
      sender: emailJob.sender.email,
      campaignId: emailJob.campaignId,
      userId: emailJob.userId,
    });

    if (result.previewUrl) {
      // eslint-disable-next-line no-console
      console.log(`[worker] sent ${emailJob.recipient} -- preview: ${result.previewUrl}`);
    }
  } catch (err) {
    await rateLimiter.releaseHourlyCapacity(emailJob.senderId);
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        failureReason: err instanceof Error ? err.message : "Unknown error",
      },
    });
    await indexEmailDoc({
      emailJobId: emailJob.id,
      recipient: emailJob.recipient,
      subject: emailJob.subject,
      status: "FAILED",
      scheduledAt: emailJob.scheduledAt.toISOString(),
      sentAt: null,
      sender: emailJob.sender.email,
      campaignId: emailJob.campaignId,
      userId: emailJob.userId,
    });
    throw err; // let BullMQ's retry/backoff policy decide whether to retry
  }
}

const worker = new Worker<EmailSendJobData>(EMAIL_SEND_QUEUE, processEmailJob, {
  connection: createRedisConnection(),
  concurrency: env.WORKER_CONCURRENCY,
});

worker.on("completed", (job) => {
  // eslint-disable-next-line no-console
  console.log(`[worker] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

// eslint-disable-next-line no-console
console.log(`[worker] started with concurrency=${env.WORKER_CONCURRENCY}, waiting for jobs...`);
