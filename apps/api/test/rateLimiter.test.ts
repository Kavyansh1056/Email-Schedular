import { describe, expect, it, beforeEach } from "vitest";
import { RateLimiter } from "../src/services/rateLimiter";

/**
 * Minimal fake Redis implementing just the commands RateLimiter uses
 * (eval, decr, set), with real key/value/TTL/NX semantics so the Lua-script
 * behavior in rateLimiter.ts is exercised faithfully without requiring a
 * live Redis server in this test environment.
 */
class FakeRedis {
  private store = new Map<string, string>();

  async eval(script: string, _numKeys: number, key: string, ...args: string[]): Promise<number> {
    if (script.includes("INCR")) {
      // RESERVE_CAPACITY_LUA
      const [limitStr] = args;
      const current = Number(this.store.get(key) ?? "0");
      const limit = Number(limitStr);
      if (current >= limit) return 0;
      this.store.set(key, String(current + 1));
      return 1;
    }
    // ACQUIRE_MIN_DELAY_LUA (SET NX PX)
    if (this.store.has(key)) return 0;
    this.store.set(key, "1");
    return 1;
  }

  async decr(key: string): Promise<number> {
    const current = Number(this.store.get(key) ?? "0");
    const next = current - 1;
    this.store.set(key, String(next));
    return next;
  }

  /** Only the two-arg-with-NX form used by the worker's Slack dedupe. */
  async set(key: string, value: string, ..._rest: unknown[]): Promise<"OK" | null> {
    if (this.store.has(key)) return null;
    this.store.set(key, value);
    return "OK";
  }

  clear() {
    this.store.clear();
  }
}

describe("RateLimiter", () => {
  let fake: FakeRedis;
  let limiter: RateLimiter;

  beforeEach(() => {
    fake = new FakeRedis();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    limiter = new RateLimiter(fake as any);
  });

  it("allows sends while under the hourly limit", async () => {
    const r1 = await limiter.tryReserveHourlyCapacity("sender-1", 2);
    const r2 = await limiter.tryReserveHourlyCapacity("sender-1", 2);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("rejects once the hourly limit is reached and returns the next window", async () => {
    await limiter.tryReserveHourlyCapacity("sender-1", 1);
    const rejected = await limiter.tryReserveHourlyCapacity("sender-1", 1);
    expect(rejected.allowed).toBe(false);
    expect(rejected.nextWindowStart.getTime()).toBeGreaterThan(Date.now());
  });

  it("keeps separate counters per sender", async () => {
    await limiter.tryReserveHourlyCapacity("sender-1", 1);
    const other = await limiter.tryReserveHourlyCapacity("sender-2", 1);
    expect(other.allowed).toBe(true);
  });

  it("releasing capacity allows another send within the same window", async () => {
    await limiter.tryReserveHourlyCapacity("sender-1", 1);
    const rejected = await limiter.tryReserveHourlyCapacity("sender-1", 1);
    expect(rejected.allowed).toBe(false);

    await limiter.releaseHourlyCapacity("sender-1");
    const allowedAgain = await limiter.tryReserveHourlyCapacity("sender-1", 1);
    expect(allowedAgain.allowed).toBe(true);
  });

  it("min-delay slot can only be acquired once per window per sender", async () => {
    const first = await limiter.tryAcquireMinDelaySlot("sender-1", 1000);
    const second = await limiter.tryAcquireMinDelaySlot("sender-1", 1000);
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("min-delay slots are independent per sender", async () => {
    await limiter.tryAcquireMinDelaySlot("sender-1", 1000);
    const other = await limiter.tryAcquireMinDelaySlot("sender-2", 1000);
    expect(other).toBe(true);
  });
});
