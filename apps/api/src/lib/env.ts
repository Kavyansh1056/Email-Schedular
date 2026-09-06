import { z } from "zod";

// Loaded once, validated eagerly so the process fails fast (at startup, not
// mid-request) if a required credential is missing. `dotenv/config` is
// imported for its side effect at the top of server.ts / worker/index.ts
// before this module is evaluated.

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_URL: z.string().url(),
  API_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),

  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().default(6379),

  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  MIN_SEND_DELAY_MS: z.coerce.number().int().min(0).default(1000),
  DEFAULT_MAX_EMAILS_PER_HOUR: z.coerce.number().int().positive().default(200),

  ETHEREAL_HOST: z.string().min(1),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().default(""),
  ETHEREAL_PASS: z.string().default(""),

  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_CALLBACK_URL: z.string().default(""),

  SLACK_CLIENT_ID: z.string().default(""),
  SLACK_CLIENT_SECRET: z.string().default(""),
  SLACK_REDIRECT_URI: z.string().default(""),
  SLACK_SIGNING_SECRET: z.string().default(""),

  ELASTICSEARCH_URL: z.string().default("http://localhost:9200"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  COOKIE_SECRET: z.string().min(16, "COOKIE_SECRET must be at least 16 characters"),
  SLACK_TOKEN_ENCRYPTION_KEY: z.string().default(""),

  ADMIN_EMAILS: z.string().default(""),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration. Check apps/api/.env against .env.example.");
  }
  return parsed.data;
}

export const env = loadEnv();

export const adminEmailSet = new Set(
  env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
);
