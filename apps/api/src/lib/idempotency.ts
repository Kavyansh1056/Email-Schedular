import { sha256 } from "./crypto";

/**
 * Deterministic idempotency key for a single (campaign, recipient) pair.
 * Used as:
 *  - EmailJob.idempotencyKey (Postgres UNIQUE constraint)
 *  - the BullMQ job id passed to queue.add()
 *
 * Because BullMQ silently no-ops when you add a job with an id that already
 * exists, and Prisma will reject a duplicate insert on idempotencyKey, this
 * single value is what makes "re-run the scheduling step after a crash"
 * safe: neither the DB row nor the queue job gets duplicated.
 */
export function buildIdempotencyKey(campaignId: string, recipientEmail: string): string {
  const normalized = recipientEmail.trim().toLowerCase();
  return sha256(`${campaignId}:${normalized}`);
}
