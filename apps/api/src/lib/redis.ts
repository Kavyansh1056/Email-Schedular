import Redis from "ioredis";
import { env } from "./env";

// BullMQ requires `maxRetriesPerRequest: null` on the connection it's given.
// We keep one connection for BullMQ (queue/worker) and a second general-purpose
// one for our own Lua scripts (rate limiting, min-delay, dedupe) so BullMQ's
// blocking commands never contend with our atomic-op calls.

export function createRedisConnection() {
  return new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
  });
}

export const redis = createRedisConnection();
