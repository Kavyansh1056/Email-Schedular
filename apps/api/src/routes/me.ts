import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { MeDTO } from "@ejs/shared";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req, res) => {
  const dto: MeDTO = {
    id: req.user!.id,
    name: req.user!.name,
    email: req.user!.email,
    avatarUrl: req.user!.avatarUrl,
  };
  res.json(dto);
});
