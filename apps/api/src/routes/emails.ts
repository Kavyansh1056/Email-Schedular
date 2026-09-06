import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { listEmailsQuerySchema, searchQuerySchema, type EmailJobDTO } from "@ejs/shared";
import { searchEmails } from "../services/searchService";

export const emailsRouter = Router();
emailsRouter.use(requireAuth);

function toDTO(job: {
  id: string;
  recipient: string;
  subject: string;
  sender: { email: string };
  campaignId: string;
  scheduledAt: Date;
  sentAt: Date | null;
  status: EmailJobDTO["status"];
  attempts: number;
  failureReason: string | null;
}): EmailJobDTO {
  return {
    id: job.id,
    recipient: job.recipient,
    subject: job.subject,
    senderEmail: job.sender.email,
    campaignId: job.campaignId,
    scheduledAt: job.scheduledAt.toISOString(),
    sentAt: job.sentAt ? job.sentAt.toISOString() : null,
    status: job.status,
    attempts: job.attempts,
    failureReason: job.failureReason,
  };
}

emailsRouter.get(
  "/scheduled",
  asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 20 } = listEmailsQuerySchema.parse(req.query);
    const where = {
      userId: req.user!.id,
      status: { in: ["SCHEDULED", "QUEUED", "RATE_LIMITED", "SENDING"] as const },
    };
    const [items, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        include: { sender: true },
        orderBy: { scheduledAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.emailJob.count({ where }),
    ]);
    res.json({ items: items.map(toDTO), total, page, pageSize });
  })
);

emailsRouter.get(
  "/sent",
  asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 20 } = listEmailsQuerySchema.parse(req.query);
    const where = { userId: req.user!.id, status: { in: ["SENT", "FAILED"] as const } };
    const [items, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        include: { sender: true },
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.emailJob.count({ where }),
    ]);
    res.json({ items: items.map(toDTO), total, page, pageSize });
  })
);

emailsRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { q, page = 1, pageSize = 20 } = searchQuerySchema.parse(req.query);
    const result = await searchEmails({
      userId: req.user!.id,
      query: q,
      from: (page - 1) * pageSize,
      size: pageSize,
    });
    res.json({ items: result.hits, total: result.total, page, pageSize });
  })
);
