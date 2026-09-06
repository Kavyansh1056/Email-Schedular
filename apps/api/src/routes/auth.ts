import { Router } from "express";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { buildGoogleAuthorizeUrl, exchangeGoogleCode } from "../services/googleAuthService";
import { signSession, SESSION_COOKIE_NAME, sessionCookieOptions } from "../lib/jwt";
import { env } from "../lib/env";
import { asyncHandler } from "../middleware/errorHandler";

export const authRouter = Router();

// In-memory OAuth `state` store keyed by state value, short-lived. For a
// multi-instance API deployment this would move to Redis; documented in
// README as a known single-instance limitation of this reference impl.
const pendingStates = new Map<string, number>();
const STATE_TTL_MS = 5 * 60 * 1000;

function issueState(): string {
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, Date.now() + STATE_TTL_MS);
  return state;
}

function consumeState(state: string | undefined): boolean {
  if (!state || !pendingStates.has(state)) return false;
  const expiry = pendingStates.get(state)!;
  pendingStates.delete(state);
  return Date.now() < expiry;
}

authRouter.get("/google", (req, res) => {
  const state = issueState();
  res.redirect(buildGoogleAuthorizeUrl(state));
});

authRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!consumeState(state)) {
      return res.redirect(`${env.WEB_URL}/login?error=invalid_state`);
    }
    if (!code) {
      return res.redirect(`${env.WEB_URL}/login?error=missing_code`);
    }

    const googleUser = await exchangeGoogleCode(code);

    const user = await prisma.user.upsert({
      where: { googleId: googleUser.sub },
      create: {
        googleId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      },
      update: {
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      },
    });

    const token = signSession({ userId: user.id });
    res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions);
    res.redirect(`${env.WEB_URL}/dashboard`);
  })
);

authRouter.post("/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});
