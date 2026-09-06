import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { createCampaignSchema } from "@ejs/shared";
import type { CampaignDTO } from "@ejs/shared";
import { scheduleCampaign } from "../services/campaignService";

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

campaignsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createCampaignSchema.parse(req.body);
    const campaign = await scheduleCampaign(req.user!.id, input);
    res.status(201).json({ id: campaign.id, totalRecipients: campaign.totalRecipients });
  })
);

campaignsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.user!.id },
      include: { sender: true },
      orderBy: { createdAt: "desc" },
    });
    const dto: CampaignDTO[] = campaigns.map((c: {
      id: string;
      subject: string;
      sender: { email: string };
      startAt: Date;
      delayMs: number;
      hourlyLimit: number | null;
      totalRecipients: number;
      createdAt: Date;
    }) => ({
      id: c.id,
      subject: c.subject,
      senderEmail: c.sender.email,
      startAt: c.startAt.toISOString(),
      delayMs: c.delayMs,
      hourlyLimit: c.hourlyLimit,
      totalRecipients: c.totalRecipients,
      createdAt: c.createdAt.toISOString(),
    }));
    res.json(dto);
  })
);
