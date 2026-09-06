import { EtherealEmailProvider } from "./etherealEmailProvider";
import type { EmailProvider } from "./emailProvider";

let instance: EmailProvider | null = null;

/**
 * Single point of provider selection. Production deployments swap this for
 * an SES/Postmark implementation without touching the worker's send logic.
 */
export function getEmailProvider(): EmailProvider {
  if (!instance) {
    instance = new EtherealEmailProvider();
  }
  return instance;
}
