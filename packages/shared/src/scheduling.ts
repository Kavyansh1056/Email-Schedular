/**
 * Computes the intended send time for the recipient at `index` (0-based)
 * within a campaign. Pure function so it's trivially unit-testable and can
 * be reused by both the API (to write EmailJob.scheduledAt) and any
 * diagnostics/preview UI.
 */
export function computeScheduledAt(
  campaignStartAt: Date,
  index: number,
  effectiveDelayMs: number
): Date {
  return new Date(campaignStartAt.getTime() + index * effectiveDelayMs);
}

/**
 * The campaign-configured delay must never violate the system-wide floor.
 */
export function computeEffectiveDelayMs(
  campaignDelayMs: number,
  minSendDelayMs: number
): number {
  return Math.max(campaignDelayMs, minSendDelayMs);
}
