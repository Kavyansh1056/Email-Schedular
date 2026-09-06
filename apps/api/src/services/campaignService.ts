import { prisma } from "../lib/prisma";
import { emailSendQueue } from "../queue/emailSendQueue";
import { buildIdempotencyKey } from "../lib/idempotency";
import { computeEffectiveDelayMs, computeScheduledAt, type CreateCampaignInput } from "@ejs/shared";
import { env } from "../lib/env";
import { ApiError } from "../middleware/errorHandler";

export async function scheduleCampaign(userId: string, input: CreateCampaignInput) {
  const sender = await prisma.sender.findFirst({ where: { id: input.senderId, userId } });
  if (!sender) {
    throw new ApiError(404, "Sender not found");
  }

  const effectiveDelayMs = computeEffectiveDelayMs(input.delayMs, env.MIN_SEND_DELAY_MS);
  const startAt = new Date(input.startAt);
  const hourlyLimit = input.hourlyLimit
    ? Math.min(input.hourlyLimit, sender.maxPerHour ?? input.hourlyLimit)
    : sender.maxPerHour ?? env.DEFAULT_MAX_EMAILS_PER_HOUR;

  // 1) Create the Campaign + all EmailJob rows in one transaction, so a
  //    crash mid-creation never leaves a campaign with a partial recipient
  //    list. `skipDuplicates` on the job insert combined with the unique
  //    idempotencyKey means re-running this (e.g. a retried request) is safe.
  // NOTE: `tx`/`job` are typed `any` here only because this sandbox could not
  // reach binaries.prisma.sh to run `prisma generate` (see README). Once you
  // run `npm run prisma:generate` locally, Prisma.TransactionClient and the
  // EmailJob model type are available and these annotations are redundant
  // (but harmless) -- feel free to tighten them to `Prisma.TransactionClient`
  // once your generated client is in place.
  const { campaign, jobs } = await prisma.$transaction(async (tx: any) => {
    const campaign = await tx.campaign.create({
      data: {
        userId,
        senderId: sender.id,
        subject: input.subject,
        body: input.body,
        startAt,
        delayMs: effectiveDelayMs,
        hourlyLimit,
        totalRecipients: input.recipients.length,
      },
    });

    const jobRows = input.recipients.map((recipient, index) => ({
      idempotencyKey: buildIdempotencyKey(campaign.id, recipient),
      campaignId: campaign.id,
      senderId: sender.id,
      userId,
      recipient,
      subject: input.subject,
      body: input.body,
      scheduledAt: computeScheduledAt(startAt, index, effectiveDelayMs),
    }));

    await tx.emailJob.createMany({ data: jobRows, skipDuplicates: true });

    const jobs = await tx.emailJob.findMany({ where: { campaignId: campaign.id } });
    return { campaign, jobs };
  });

  // 2) Add one delayed BullMQ job per EmailJob, using the same idempotency
  //    key as the deterministic job id. If this step is ever re-run (e.g.
  //    the API crashed between the transaction above and this loop, and a
  //    reconciliation job re-invokes it), BullMQ treats re-adding an
  //    existing job id as a no-op rather than creating a duplicate.
  const now = Date.now();
  await Promise.all(
    jobs.map(async (job: { id: string; scheduledAt: Date; senderId: string; campaignId: string; idempotencyKey: string }) => {
      const delay = Math.max(0, job.scheduledAt.getTime() - now);
      await emailSendQueue.add(
        "send",
        { emailJobId: job.id, senderId: job.senderId, campaignId: job.campaignId },
        { jobId: job.idempotencyKey, delay }
      );
      await prisma.emailJob.update({
        where: { id: job.id },
        data: { status: "QUEUED", bullJobId: job.idempotencyKey },
      });
    })
  );

  return campaign;
}
