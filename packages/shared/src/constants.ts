export const EMAIL_SEND_QUEUE = "email-send";

/**
 * Deterministic idempotency key shared by:
 *  - EmailJob.idempotencyKey (Postgres unique constraint)
 *  - the BullMQ job id (so re-adding a job for the same recipient/campaign
 *    is a safe no-op, not a duplicate)
 *
 * Hashing is done with sha256 in lib/idempotency.ts (needs the `crypto`
 * module, which we don't want to force into this isomorphic shared package),
 * this file just documents the key format used everywhere else.
 */
export function rateLimitKey(senderId: string, hourWindow: number): string {
  return `rate:{${senderId}}:${hourWindow}`;
}

export function minDelayKey(senderId: string): string {
  return `mindelay:{${senderId}}`;
}

export function slackNotifyDedupeKey(senderId: string, hourWindow: number): string {
  return `notified:{${senderId}}:${hourWindow}`;
}

/** Current hour bucket, e.g. 471234 (hours since epoch). Used as the rate-limit window id. */
export function currentHourWindow(date: Date = new Date()): number {
  return Math.floor(date.getTime() / (60 * 60 * 1000));
}
