// Mirrors the Prisma `EmailStatus` enum. Kept here (rather than importing the
// generated Prisma client into the frontend) so apps/web can use it without
// depending on Prisma at all.
export const EMAIL_STATUSES = [
  "SCHEDULED",
  "QUEUED",
  "SENDING",
  "SENT",
  "FAILED",
  "RATE_LIMITED",
] as const;

export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export interface EmailJobDTO {
  id: string;
  recipient: string;
  subject: string;
  senderEmail: string;
  campaignId: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  attempts: number;
  failureReason: string | null;
}

export interface CampaignDTO {
  id: string;
  subject: string;
  senderEmail: string;
  startAt: string;
  delayMs: number;
  hourlyLimit: number | null;
  totalRecipients: number;
  createdAt: string;
}

export interface SenderDTO {
  id: string;
  email: string;
  label: string | null;
  maxPerHour: number | null;
}

export interface MeDTO {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface SlackStatusDTO {
  connected: boolean;
  teamName?: string;
}

/**
 * The payload placed on a BullMQ "email-send" job. Intentionally minimal:
 * the EmailJob row in Postgres is the source of truth, the queue payload
 * just needs enough to find that row quickly without an extra lookup.
 */
export interface EmailSendJobData {
  emailJobId: string;
  senderId: string;
  campaignId: string;
}
