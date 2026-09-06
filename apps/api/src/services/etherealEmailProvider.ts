import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../lib/env";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./emailProvider";

export class EtherealEmailProvider implements EmailProvider {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.ETHEREAL_HOST,
      port: env.ETHEREAL_PORT,
      secure: false, // Ethereal uses STARTTLS on 587
      auth: {
        user: env.ETHEREAL_USER,
        pass: env.ETHEREAL_PASS,
      },
    });
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const info = await this.transporter.sendMail({
      from: input.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    // nodemailer.getTestMessageUrl only works for Ethereal accounts; guard
    // for other future providers that won't have this helper apply.
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    return {
      messageId: info.messageId ?? null,
      previewUrl,
    };
  }
}
