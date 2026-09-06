import { prisma } from "../lib/prisma";
import { decryptSecret, encryptSecret } from "../lib/crypto";
import { env } from "../lib/env";

const SLACK_OAUTH_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_OAUTH_ACCESS_URL = "https://slack.com/api/oauth.v2.access";
const SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";

export function buildSlackAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: "chat:write,channels:read",
    redirect_uri: env.SLACK_REDIRECT_URI,
    state,
  });
  return `${SLACK_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  team?: { id: string; name: string };
  incoming_webhook?: { channel_id?: string };
  error?: string;
}

export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  teamId: string;
  teamName: string;
  channelId: string | null;
}> {
  const res = await fetch(SLACK_OAUTH_ACCESS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI,
    }),
  });
  const data = (await res.json()) as SlackOAuthResponse;

  if (!data.ok || !data.access_token || !data.team) {
    throw new Error(`Slack OAuth exchange failed: ${data.error ?? "unknown error"}`);
  }

  return {
    accessToken: data.access_token,
    teamId: data.team.id,
    teamName: data.team.name,
    channelId: data.incoming_webhook?.channel_id ?? null,
  };
}

export async function saveSlackConnection(
  userId: string,
  connection: { accessToken: string; teamId: string; teamName: string; channelId: string | null }
) {
  const accessTokenEncrypted = encryptSecret(connection.accessToken);
  await prisma.slackConnection.upsert({
    where: { userId },
    create: {
      userId,
      teamId: connection.teamId,
      teamName: connection.teamName,
      channelId: connection.channelId,
      accessTokenEncrypted,
    },
    update: {
      teamId: connection.teamId,
      teamName: connection.teamName,
      channelId: connection.channelId,
      accessTokenEncrypted,
    },
  });
}

export async function getSlackStatus(userId: string) {
  const conn = await prisma.slackConnection.findUnique({ where: { userId } });
  if (!conn) return { connected: false as const };
  return { connected: true as const, teamName: conn.teamName };
}

export async function disconnectSlack(userId: string) {
  await prisma.slackConnection.deleteMany({ where: { userId } });
}

/**
 * Sends a real Slack message via the Web API on behalf of the connected
 * user. If the user has no Slack connection, this is a silent no-op — the
 * requirement is "skip if not connected", not "crash the worker".
 */
export async function sendRateLimitSlackNotification(params: {
  userId: string;
  senderEmail: string;
  hourlyLimit: number;
}): Promise<void> {
  const conn = await prisma.slackConnection.findUnique({ where: { userId: params.userId } });
  if (!conn) return; // Slack not connected -- skip, do not throw.

  const token = decryptSecret(conn.accessTokenEncrypted);
  const channel = conn.channelId ?? "general";

  const text =
    `:warning: *Email sending limit reached*\n` +
    `Sender: ${params.senderEmail}\n` +
    `Hourly limit: ${params.hourlyLimit}\n` +
    `Remaining emails have been rescheduled for the next available window.`;

  const res = await fetch(SLACK_POST_MESSAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, text }),
  });

  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) {
    // Don't throw -- a failed Slack notification must never fail the email
    // send/reschedule flow. Log for observability instead.
    // eslint-disable-next-line no-console
    console.error("Slack notification failed:", data.error);
  }
}
