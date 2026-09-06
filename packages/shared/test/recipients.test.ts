import { describe, expect, it } from "vitest";
import { parseRecipients } from "../src/recipients";

describe("parseRecipients", () => {
  it("parses a plain newline-separated TXT list", () => {
    const input = "a@example.com\nb@example.com\nc@example.com";
    const result = parseRecipients(input);
    expect(result.valid).toEqual(["a@example.com", "b@example.com", "c@example.com"]);
    expect(result.invalidCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
  });

  it("parses a CSV with an email header column", () => {
    const input = "name,email\nAlice,alice@example.com\nBob,bob@example.com";
    const result = parseRecipients(input);
    expect(result.valid).toEqual(["alice@example.com", "bob@example.com"]);
  });

  it("de-duplicates case-insensitively", () => {
    const input = "a@example.com\nA@Example.com\na@example.com";
    const result = parseRecipients(input);
    expect(result.valid).toEqual(["a@example.com"]);
    expect(result.duplicateCount).toBe(2);
  });

  it("rejects malformed addresses without throwing", () => {
    const input = "valid@example.com\nnot-an-email\n@missing-local.com\nspaced @example.com";
    const result = parseRecipients(input);
    expect(result.valid).toContain("valid@example.com");
    expect(result.invalidCount).toBeGreaterThanOrEqual(2);
  });

  it("handles an empty file", () => {
    const result = parseRecipients("");
    expect(result.valid).toEqual([]);
    expect(result.invalidCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
  });

  it("handles a CSV without an email header by scanning every cell", () => {
    const input = "alice@example.com,555-1234\nbob@example.com,555-5678";
    const result = parseRecipients(input);
    expect(result.valid).toEqual(["alice@example.com", "bob@example.com"]);
  });
});
