# Requirements Checklist

Legend: ✅ implemented & typechecked in this repo · ⚠️ implemented, but only verifiable end-to-end
on a machine with Docker + internet (see "Sandbox note" in README section 7) · ❌ not done.

| Requirement | Status | File(s) | How to demonstrate |
|---|---|---|---|
| Google OAuth login | ⚠️ | `src/routes/auth.ts`, `src/services/googleAuthService.ts` | Click "Continue with Google" in DEMO.md step 1 |
| Dashboard w/ avatar/name/email/logout | ✅ | `apps/web/src/pages/DashboardPage.tsx` | Log in, see header |
| Slack connect/disconnect (real OAuth) | ⚠️ | `src/routes/slack.ts`, `src/services/slackService.ts`, `apps/web/src/components/SlackConnectionCard.tsx` | DEMO.md step 3 |
| Compose email campaign | ✅ | `apps/web/src/components/ComposeDrawer.tsx` | DEMO.md step 4 |
| Upload CSV/TXT recipients | ✅ | `packages/shared/src/recipients.ts`, `src/routes/recipients.ts` | Upload `demo/sample-recipients.csv` |
| Select sender | ✅ | `src/routes/senders.ts`, `ComposeDrawer.tsx` | Sender dropdown in compose modal |
| Add sender (UI, not just API) | ✅ | `apps/web/src/components/AddSenderModal.tsx`, wired into `DashboardPage.tsx` | Click "+ Add sender" on the dashboard |
| Configure start time | ✅ | `ComposeDrawer.tsx` (`startAt` field), `schemas.ts` | Set datetime in compose modal |
| Configure delay between emails | ✅ | `scheduling.ts` (`computeScheduledAt`, `computeEffectiveDelayMs`) | Set delay field; see spaced `scheduledAt` values |
| Configure hourly sending limit | ✅ | `campaignService.ts`, `rateLimiter.ts` | Set low limit; see `RATE_LIMITED` status appear |
| Schedule emails | ✅ | `src/services/campaignService.ts` | Click Schedule; rows appear in Scheduled tab |
| View scheduled emails | ✅ | `src/routes/emails.ts` (`/scheduled`), `EmailTable.tsx` | Scheduled tab |
| View sent/failed emails | ✅ | `src/routes/emails.ts` (`/sent`) | Sent tab |
| Search emails | ✅ | `src/services/searchService.ts`, `/api/emails/search` | Search bar in dashboard |
| BullMQ monitoring dashboard | ✅ | `src/queue/bullBoard.ts` | `/admin/queues`, DEMO.md step 8 |
| No cron anywhere | ✅ | verified via `grep` audit; only `bullmq` delayed jobs used | `grep -r cron apps packages` finds nothing |
| Prisma schema (User/Sender/Campaign/EmailJob/SlackConnection) | ✅ | `apps/api/prisma/schema.prisma` | Schema file |
| EmailJob statuses (6 states) | ✅ | `schema.prisma` `EmailStatus` enum | Schema file |
| Idempotency (unique key + deterministic job id) | ✅ | `src/lib/idempotency.ts`, tested in `test/idempotency.test.ts` | `npm run test -w apps/api` |
| Idempotency documented limitation (no exactly-once SMTP) | ✅ | README section 21, `worker/index.ts` inline comment | README |
| Restart persistence (Redis AOF, no queue flush) | ⚠️ | `docker-compose.yml` (`--appendonly yes`), `worker/index.ts` | DEMO.md step 14 |
| Distributed min-send-delay | ✅ | `src/services/rateLimiter.ts` (`tryAcquireMinDelaySlot`), tested | `npm run test -w apps/api` |
| Distributed per-sender hourly rate limit | ✅ | `src/services/rateLimiter.ts` (`tryReserveHourlyCapacity`), tested | `npm run test -w apps/api` |
| Rate limit reschedules, never drops | ✅ | `worker/index.ts` (rate-limit branch) | DEMO.md step 12 |
| Slack rate-limit notification, deduped | ⚠️ | `worker/index.ts`, `slackService.ts` (`SET ... NX EX 3600`) | DEMO.md step 13 |
| Elasticsearch indexing + search, user-scoped | ⚠️ | `src/services/searchService.ts` | DEMO.md step 11 |
| Elasticsearch failure doesn't break sending | ✅ | `indexEmailDoc` try/catch, README section 18 | Code review |
| Bull Board protected (not fully public) | ✅ | `src/queue/bullBoard.ts` (`requireAuth` + `requireAdmin`) | Try `/admin/queues` while logged out → 401 |
| REST API surface (auth/campaigns/emails/senders/slack/health) | ✅ | `apps/api/src/routes/*.ts` | Route files |
| Zod validation + consistent errors | ✅ | `packages/shared/src/schemas.ts`, `src/middleware/errorHandler.ts` | Submit invalid campaign payload → 400 with details |
| Auth middleware protecting private routes | ✅ | `src/middleware/auth.ts` | Any `/api/*` route without cookie → 401 |
| Pagination | ✅ | `src/routes/emails.ts` (`page`/`pageSize`) | `/api/emails/scheduled?page=2` |
| Clean SaaS-style frontend, tabs, search, compose modal | ✅ | `apps/web/src/pages/DashboardPage.tsx` | Run `npm run dev:web` |
| Loading skeleton / empty / error states | ✅ | `TableSkeleton.tsx`, `States.tsx` | Reload dashboard, view empty account |
| Toast notifications | ✅ | `Toast.tsx` | Schedule a campaign, see success toast |
| Responsive layout | ✅ | Tailwind responsive classes in `DashboardPage.tsx` | Resize browser |
| Security: helmet/cors/httpOnly cookies/OAuth state/no leaked secrets | ✅ | `server.ts`, `jwt.ts`, `auth.ts`, `slack.ts` | Code review, README section 28 |
| Docker Compose (Postgres/Redis/ES, volumes, healthchecks) | ⚠️ | `docker-compose.yml` | `docker-compose up -d` on a Docker-enabled machine |
| Comprehensive `.env.example`, no real secrets | ✅ | `.env.example` | File review |
| README with all 30 requested sections + Mermaid diagram | ✅ | `README.md` | File review |
| Tests: scheduling math, CSV parsing, rate limiting, idempotency, validation | ✅ | `packages/shared/test/*`, `apps/api/test/*` — 27 tests passing | `npm run test -w packages/shared && npm run test -w apps/api` |
| `DEMO.md` + sample CSV | ✅ | `DEMO.md`, `demo/sample-recipients.csv` | File review |
| `REQUIREMENTS_CHECKLIST.md` | ✅ | this file | — |
| Final verification: install/typecheck/build/tests/no TODOs/no secrets/no cron | ✅ (with Prisma caveat below) | see "Final verification results" | Re-run the commands listed there |

## Final verification results (run inside the sandbox that authored this project)

```
npm install                          -> OK, 458 packages across all 3 workspaces
npx tsc --noEmit (packages/shared)   -> 0 errors
npx tsc --noEmit (apps/api)          -> 0 errors
npx tsc --noEmit (apps/web)          -> 0 errors
npx vite build (apps/web)            -> OK, dist/ produced
npx vitest run (packages/shared)     -> 17 passed
npx vitest run (apps/api)            -> 10 passed
grep for TODO/FIXME                  -> none found
grep for cron/node-cron/agenda       -> none found
grep for hardcoded-looking secrets   -> none found
```

**Not runnable in that sandbox** (no Docker daemon; no network route to `binaries.prisma.sh`,
`accounts.google.com`, or `slack.com`): `docker-compose up`, `prisma generate`/`migrate`, and a
live end-to-end OAuth handshake. These are marked ⚠️ above and are expected to work as written
once run on a machine with Docker and normal internet access — run the "Local setup" commands in
README section 7 to verify them yourself.
