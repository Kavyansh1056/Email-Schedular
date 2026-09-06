import { describe, expect, it } from "vitest";
import { createCampaignSchema, createSenderSchema } from "../src/schemas";

describe("createSenderSchema", () => {
  it("accepts a valid sender", () => {
    const result = createSenderSchema.safeParse({ email: "a@example.com", label: "Primary" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = createSenderSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("createCampaignSchema", () => {
  const base = {
    senderId: "550e8400-e29b-41d4-a716-446655440000",
    subject: "Hello",
    body: "<p>Hi</p>",
    recipients: ["a@example.com", "b@example.com"],
    startAt: new Date().toISOString(),
    delayMs: 2000,
  };

  it("accepts a valid campaign payload", () => {
    expect(createCampaignSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty recipient list", () => {
    const result = createCampaignSchema.safeParse({ ...base, recipients: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a negative delay", () => {
    const result = createCampaignSchema.safeParse({ ...base, delayMs: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid senderId", () => {
    const result = createCampaignSchema.safeParse({ ...base, senderId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
