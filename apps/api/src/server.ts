import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { campaignsRouter } from "./routes/campaigns";
import { sendersRouter } from "./routes/senders";
import { emailsRouter } from "./routes/emails";
import { recipientsRouter } from "./routes/recipients";
import { slackRouter } from "./routes/slack";
import { healthRouter } from "./routes/health";
import { mountBullBoard } from "./queue/bullBoard";
import { errorHandler } from "./middleware/errorHandler";
import { ensureEmailIndex } from "./services/searchService";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.WEB_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser(env.COOKIE_SECRET));

// General API rate limiting -- protects auth + write endpoints from abuse.
// Separate from the per-sender EMAIL rate limiting in services/rateLimiter.ts,
// which governs outbound send volume, not inbound HTTP traffic.
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/senders", sendersRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/recipients", recipientsRouter);
app.use("/api/slack", slackRouter);
app.use("/admin/queues", mountBullBoard());

app.use(errorHandler);

async function start() {
  try {
    await ensureEmailIndex();
  } catch (err) {
    // Elasticsearch being down at boot should not prevent the API (and
    // email sending) from starting -- search is a best-effort feature.
    // eslint-disable-next-line no-console
    console.error("Could not ensure Elasticsearch index at startup (continuing):", err);
  }

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on http://localhost:${env.PORT}`);
  });
}

start();

export { app };
