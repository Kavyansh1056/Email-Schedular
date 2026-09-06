import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { SESSION_COOKIE_NAME, verifySession } from "../lib/jwt";
import { adminEmailSet } from "../lib/env";

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const payload = verifySession(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    req.user = { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

/** Extra gate for /admin/queues — being logged in is not enough. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !adminEmailSet.has(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
