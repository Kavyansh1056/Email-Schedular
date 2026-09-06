import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { createSenderSchema } from "@ejs/shared";
import type { SenderDTO } from "@ejs/shared";

export const sendersRouter = Router();
sendersRouter.use(requireAuth);

sendersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const senders = await prisma.sender.findMany({ where: { userId: req.user!.id } });
    const dto: SenderDTO[] = senders.map((s: { id: string; email: string; label: string | null; maxPerHour: number | null }) => ({
      id: s.id,
      email: s.email,
      label: s.label,
      maxPerHour: s.maxPerHour,
    }));
    res.json(dto);
  })
);

sendersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createSenderSchema.parse(req.body);
    const sender = await prisma.sender.create({
      data: { userId: req.user!.id, email: input.email, label: input.label, maxPerHour: input.maxPerHour },
    });
    const dto: SenderDTO = { id: sender.id, email: sender.email, label: sender.label, maxPerHour: sender.maxPerHour };
    res.status(201).json(dto);
  })
);
