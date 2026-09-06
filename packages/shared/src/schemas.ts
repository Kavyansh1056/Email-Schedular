import { z } from "zod";

export const createSenderSchema = z.object({
  email: z.string().email(),
  label: z.string().max(100).optional(),
  maxPerHour: z.number().int().positive().max(10000).optional(),
});
export type CreateSenderInput = z.infer<typeof createSenderSchema>;

export const createCampaignSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1).max(50000),
  startAt: z.string().datetime(),
  delayMs: z.number().int().min(0).max(1000 * 60 * 60 * 24),
  hourlyLimit: z.number().int().positive().max(10000).optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const listEmailsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).optional(),
});
