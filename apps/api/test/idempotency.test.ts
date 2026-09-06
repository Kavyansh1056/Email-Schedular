import { describe, expect, it } from "vitest";
import { buildIdempotencyKey } from "../src/lib/idempotency";

describe("buildIdempotencyKey", () => {
  it("is deterministic for the same campaign + recipient", () => {
    const a = buildIdempotencyKey("campaign-1", "user@example.com");
    const b = buildIdempotencyKey("campaign-1", "user@example.com");
    expect(a).toBe(b);
  });

  it("normalizes case and whitespace in the recipient", () => {
    const a = buildIdempotencyKey("campaign-1", "  User@Example.com  ");
    const b = buildIdempotencyKey("campaign-1", "user@example.com");
    expect(a).toBe(b);
  });

  it("differs across campaigns for the same recipient", () => {
    const a = buildIdempotencyKey("campaign-1", "user@example.com");
    const b = buildIdempotencyKey("campaign-2", "user@example.com");
    expect(a).not.toBe(b);
  });

  it("differs across recipients within the same campaign", () => {
    const a = buildIdempotencyKey("campaign-1", "a@example.com");
    const b = buildIdempotencyKey("campaign-1", "b@example.com");
    expect(a).not.toBe(b);
  });
});
