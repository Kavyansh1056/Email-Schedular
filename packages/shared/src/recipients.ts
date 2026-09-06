// Lightweight, dependency-free email validation. Deliberately conservative:
// good enough to reject obvious garbage from a CSV/TXT upload without
// pulling in a full RFC 5322 parser for a hiring assignment.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParseRecipientsResult {
  valid: string[];
  invalidCount: number;
  duplicateCount: number;
}

/**
 * Accepts raw CSV or TXT file contents and extracts a deduplicated list of
 * valid, lowercased email addresses.
 *
 * Rules:
 *  - Splits on newlines AND commas (so both `a@x.com\nb@x.com` and a CSV
 *    column of comma-separated addresses work).
 *  - If the file looks like a CSV with a header row containing "email",
 *    only that column is used; otherwise every cell is scanned for an
 *    email-shaped token.
 *  - Whitespace-trimmed, case-insensitive de-duplication.
 */
export function parseRecipients(fileContents: string): ParseRecipientsResult {
  const lines = fileContents
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { valid: [], invalidCount: 0, duplicateCount: 0 };
  }

  const header = lines[0].toLowerCase();
  const looksLikeCsvWithHeader = header.includes("email") && header.includes(",") === false
    ? header === "email"
    : header.split(",").some((cell) => cell.trim().toLowerCase() === "email");

  let emailColumnIndex = -1;
  let dataLines = lines;

  if (looksLikeCsvWithHeader) {
    const cells = lines[0].split(",").map((c) => c.trim().toLowerCase());
    emailColumnIndex = cells.indexOf("email");
    dataLines = lines.slice(1);
  }

  const seen = new Set<string>();
  const valid: string[] = [];
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const line of dataLines) {
    const tokens = emailColumnIndex >= 0
      ? [line.split(",")[emailColumnIndex] ?? ""]
      : line.split(",");

    for (const rawToken of tokens) {
      const candidate = rawToken.trim();
      if (candidate.length === 0) continue;

      const normalized = candidate.toLowerCase();
      if (!EMAIL_RE.test(normalized)) {
        invalidCount += 1;
        continue;
      }

      if (seen.has(normalized)) {
        duplicateCount += 1;
        continue;
      }

      seen.add(normalized);
      valid.push(normalized);
    }
  }

  return { valid, invalidCount, duplicateCount };
}
