import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {
  buildSlackAuthorizeUrl,
  disconnectSlack,
  exchangeSlackCode,
  getSlackStatus,
  saveSlackConnection,
} from "../services/slackService";
import { env } from "../lib/env";
import { signSession, verifySession, SESSION_COOKIE_NAME } from "../lib/jwt";

export const slackRouter = Router();

// Slack's redirect back to our callback won't carry our session cookie's
// SameSite context the same way a same-site navigation would in all
// browsers, so we encode the user id into the `state` JWT itself instead of
// relying solely on the session cookie being present at the callback --
// this also doubles as CSRF protection for the OAuth flow.
slackRouter.get(
  "/connect",
  requireAuth,
  (req, res) => {
    const state = signSession({ userId: req.user!.id });
    res.redirect(buildSlackAuthorizeUrl(state));
  }
);

slackRouter.get(
  "/callback",
  asyncHandler(async (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    if (!code || !state) {
      return res.redirect(`${env.WEB_URL}/dashboard?slack=error`);
    }

    let userId: string;
    try {
      userId = verifySession(state).userId;
    } catch {
      return res.redirect(`${env.WEB_URL}/dashboard?slack=invalid_state`);
    }

    const connection = await exchangeSlackCode(code);
    await saveSlackConnection(userId, connection);
    res.redirect(`${env.WEB_URL}/dashboard?slack=connected`);
  })
);

slackRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await getSlackStatus(req.user!.id);
    res.json(status);
  })
);

slackRouter.post(
  "/disconnect",
  requireAuth,
  asyncHandler(async (req, res) => {
    await disconnectSlack(req.user!.id);
    res.json({ ok: true });
  })
);
