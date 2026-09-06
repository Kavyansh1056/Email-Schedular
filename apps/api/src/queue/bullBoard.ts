import { Router } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailSendQueue } from "../queue/emailSendQueue";
import { requireAdmin, requireAuth } from "../middleware/auth";

export function mountBullBoard(): Router {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(emailSendQueue)],
    serverAdapter,
  });

  const router = Router();
  // Session cookie auth, PLUS an explicit admin allow-list -- being logged
  // in is not sufficient to see internal queue internals/PII in job data.
  router.use(requireAuth, requireAdmin, serverAdapter.getRouter());
  return router;
}
