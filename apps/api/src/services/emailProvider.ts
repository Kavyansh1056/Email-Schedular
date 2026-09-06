export interface SendEmailInput {
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  /** Provider-assigned message id, when available (e.g. SMTP messageId). */
  messageId: string | null;
  /** Provider-specific preview/tracking URL, if any (Ethereal gives one). */
  previewUrl: string | null;
}

/**
 * The worker depends on this interface, not on Nodemailer directly. Swapping
 * Ethereal for SES/Postmark/SendGrid in production is a matter of adding a
 * new implementation and changing one line in services/emailProviderFactory.ts
 * — no changes to queue/worker logic.
 */
export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
