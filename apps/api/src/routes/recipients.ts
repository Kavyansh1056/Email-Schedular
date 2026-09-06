import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { parseRecipients } from "@ejs/shared";

export const recipientsRouter = Router();
recipientsRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is plenty for a recipient list
});

recipientsRouter.post(
  "/parse",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const contents = req.file.buffer.toString("utf-8");
    const result = parseRecipients(contents);
    res.json({
      validCount: result.valid.length,
      invalidCount: result.invalidCount,
      duplicateCount: result.duplicateCount,
      recipients: result.valid,
    });
  })
);
