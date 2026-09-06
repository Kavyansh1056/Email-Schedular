import { describe, expect, it } from "vitest";
import { computeEffectiveDelayMs, computeScheduledAt } from "../src/scheduling";

describe("computeScheduledAt", () => {
  it("schedules the first recipient exactly at campaign start", () => {
    const start = new Date("2026-01-01T09:00:00.000Z");
    const result = computeScheduledAt(start, 0, 5000);
    expect(result.toISOString()).toBe("2026-01-01T09:00:00.000Z");
  });

  it("offsets each subsequent recipient by index * delay", () => {
    const start = new Date("2026-01-01T09:00:00.000Z");
    const result = computeScheduledAt(start, 3, 2000);
    expect(result.toISOString()).toBe("2026-01-01T09:00:06.000Z");
  });
});

describe("computeEffectiveDelayMs", () => {
  it("uses the campaign delay when it exceeds the system minimum", () => {
    expect(computeEffectiveDelayMs(5000, 1000)).toBe(5000);
  });

  it("clamps up to the system minimum when the campaign delay is too low", () => {
    expect(computeEffectiveDelayMs(200, 1000)).toBe(1000);
  });

  it("treats a zero campaign delay as still subject to the floor", () => {
    expect(computeEffectiveDelayMs(0, 1500)).toBe(1500);
  });
});
