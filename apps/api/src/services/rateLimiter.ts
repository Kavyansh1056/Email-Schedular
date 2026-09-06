import type Redis from "ioredis";
import { currentHourWindow, minDelayKey, rateLimitKey } from "@ejs/shared";
import { env } from "../lib/env";

// --- Hourly cap: atomic GET+INCR+EXPIRE via Lua, so N worker processes ---
// --- never race on a shared in-memory counter.                          ---
//
// KEYS[1] = rate:{senderId}:{hourWindow}
// ARGV[1] = limit
// ARGV[2] = ttl seconds (a little over an hour, so a key never lingers
//           past its window even if nothing cleans it up)
// returns 1 if capacity was reserved, 0 if the sender is at its cap.
const RESERVE_CAPACITY_LUA = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local limit = tonumber(ARGV[1])
if current >= limit then
  return 0
end
redis.call("INCR", KEYS[1])
redis.call("EXPIRE", KEYS[1], ARGV[2])
return 1
`;

// --- Minimum delay between sends for a given sender: a short-lived lock ---
// acquired with SET NX PX. If it already exists, another worker sent (or is
// sending) for this sender too recently.
const ACQUIRE_MIN_DELAY_LUA = `
local ok = redis.call("SET", KEYS[1], "1", "NX", "PX", ARGV[1])
if ok then
  return 1
end
return 0
`;

export class RateLimiter {
  constructor(private readonly redis: Redis) {}

  /**
   * Attempts to reserve one unit of hourly capacity for `senderId`.
   * Returns { allowed: true } if the send may proceed, or
   * { allowed: false, nextWindowStart } with the next hour boundary the
   * caller should reschedule for.
   */
  async tryReserveHourlyCapacity(
    senderId: string,
    limit: number
  ): Promise<{ allowed: boolean; nextWindowStart: Date; hourWindow: number }> {
    const hourWindow = currentHourWindow();
    const key = rateLimitKey(senderId, hourWindow);
    const result = (await this.redis.eval(
      RESERVE_CAPACITY_LUA,
      1,
      key,
      String(limit),
      String(60 * 65) // 65 min TTL, comfortably covers the 1-hour window
    )) as number;

    const nextWindowStart = new Date((hourWindow + 1) * 60 * 60 * 1000);
    return { allowed: result === 1, nextWindowStart, hourWindow };
  }

  /**
   * Releases a previously reserved unit of capacity. Used when a send fails
   * for a reason unrelated to rate limiting (e.g. SMTP error) so we don't
   * needlessly waste hourly quota on a message that never actually sent.
   */
  async releaseHourlyCapacity(senderId: string): Promise<void> {
    const hourWindow = currentHourWindow();
    const key = rateLimitKey(senderId, hourWindow);
    await this.redis.decr(key);
  }

  /**
   * Enforces MIN_SEND_DELAY_MS between sends for the same sender, across
   * all worker processes. Returns true if the caller may send now.
   */
  async tryAcquireMinDelaySlot(senderId: string, effectiveDelayMs: number): Promise<boolean> {
    const key = minDelayKey(senderId);
    const windowMs = Math.max(effectiveDelayMs, env.MIN_SEND_DELAY_MS, 1);
    const result = (await this.redis.eval(ACQUIRE_MIN_DELAY_LUA, 1, key, String(windowMs))) as number;
    return result === 1;
  }
}
