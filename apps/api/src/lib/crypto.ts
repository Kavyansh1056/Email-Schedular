import crypto from "node:crypto";
import { env } from "./env";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  if (!env.SLACK_TOKEN_ENCRYPTION_KEY) {
    throw new Error(
      "SLACK_TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32` and add it to your .env."
    );
  }
  const key = Buffer.from(env.SLACK_TOKEN_ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("SLACK_TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars).");
  }
  return key;
}

/** Returns `iv:authTag:ciphertext`, all hex-encoded. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
