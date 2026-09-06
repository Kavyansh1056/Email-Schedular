import { Client } from "@elastic/elasticsearch";
import { env } from "../lib/env";
import type { EmailStatus } from "@ejs/shared";

export const esClient = new Client({ node: env.ELASTICSEARCH_URL });

export const EMAIL_INDEX = "emails";

export interface EmailSearchDoc {
  emailJobId: string;
  recipient: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  sender: string;
  campaignId: string;
  userId: string;
}

export async function ensureEmailIndex(): Promise<void> {
  const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
  if (exists) return;

  await esClient.indices.create({
    index: EMAIL_INDEX,
    mappings: {
      properties: {
        emailJobId: { type: "keyword" },
        recipient: { type: "text", fields: { keyword: { type: "keyword" } } },
        subject: { type: "text" },
        status: { type: "keyword" },
        scheduledAt: { type: "date" },
        sentAt: { type: "date" },
        sender: { type: "keyword" },
        campaignId: { type: "keyword" },
        userId: { type: "keyword" },
      },
    },
  });
}

/**
 * Indexing is intentionally best-effort: a failure here must never roll back
 * or block the email send/DB write it's describing. Postgres remains the
 * source of truth; Elasticsearch is a (possibly briefly stale or missing)
 * search projection. See README "Elasticsearch consistency trade-off".
 */
export async function indexEmailDoc(doc: EmailSearchDoc): Promise<void> {
  try {
    await esClient.index({
      index: EMAIL_INDEX,
      id: doc.emailJobId,
      document: doc,
      refresh: "wait_for",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Elasticsearch indexing failed (non-fatal):", err);
  }
}

export async function searchEmails(params: {
  userId: string;
  query: string;
  from: number;
  size: number;
}): Promise<{ hits: EmailSearchDoc[]; total: number }> {
  try {
    const result = await esClient.search<EmailSearchDoc>({
      index: EMAIL_INDEX,
      from: params.from,
      size: params.size,
      query: {
        bool: {
          filter: [{ term: { userId: params.userId } }],
          must: [
            {
              multi_match: {
                query: params.query,
                fields: ["recipient", "recipient.keyword^2", "subject"],
                fuzziness: "AUTO",
              },
            },
          ],
        },
      },
    });
    const hits = result.hits.hits.map((h) => h._source as EmailSearchDoc);
    const total = typeof result.hits.total === "number" ? result.hits.total : result.hits.total?.value ?? 0;
    return { hits, total };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Elasticsearch search failed:", err);
    // Degrade gracefully: an ES outage should not 500 the whole search endpoint's
    // callers into thinking the app is down; return an empty result set instead.
    return { hits: [], total: 0 };
  }
}
