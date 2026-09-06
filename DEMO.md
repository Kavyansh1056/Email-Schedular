# Demo Script (< 5 minutes)

Prep beforehand: `docker-compose up -d`, `.env` filled in, `npm run prisma:migrate`, and all three
processes running (`dev:api`, `dev:worker`, `dev:web`). Have `demo/sample-recipients.csv` handy.

1. **Google login** — open http://localhost:5173, click "Continue with Google", sign in. You land
   on `/dashboard`.
2. **User dashboard** — point out your avatar, name, and email in the header.
3. **Slack connection** — click "Connect Slack", approve in the real Slack consent screen, land
   back on the dashboard showing "Connected to <team>".
4. **Compose campaign** — click "+ Compose New Email". Fill in sender (add one first via
   `POST /api/senders` or a quick senders UI action if present), subject, body.
5. **Upload recipients** — upload `demo/sample-recipients.csv`. Point out the live
   "N valid recipients detected" line (it will also show the invalid/duplicate rows getting
   filtered out).
6. **Schedule** — set start time to ~1 minute from now, delay 2000ms, hourly limit low (e.g. 3) to
   make the rate-limit demo easy. Click Schedule. Toast confirms; modal closes.
7. **Scheduled table** — switch to the "Scheduled" tab, show the rows with status `QUEUED` and
   their computed `scheduledAt` times spaced by the delay.
8. **Bull Board** — open http://localhost:4000/admin/queues (must be signed in with an email in
   `ADMIN_EMAILS`), show the `email-send` queue's `delayed` jobs matching the same schedule.
9. **Emails moving to sent** — wait for the start time to arrive; refresh the Scheduled tab, watch
   rows disappear as they move to `SENT` (or briefly `SENDING`), then check the "Sent" tab.
10. **Ethereal preview/proof** — copy the preview URL logged by the worker process
    (`[worker] sent ... -- preview: https://ethereal.email/message/...`) and open it to show the
    actually-delivered message content.
11. **Search** — type a recipient's name or the subject into the search bar; show the Elasticsearch-
    backed results.
12. **Rate-limit hit** — because the hourly limit was set low, once it's exceeded, watch a
    recipient's status become `RATE_LIMITED` with a rescheduled `scheduledAt` in the next hour.
13. **Real Slack notification** — switch to the connected Slack channel and show the
    "⚠️ Email sending limit reached" message that arrived when step 12 happened.
14. **Restart persistence test:**
    - Schedule one more email 5+ minutes in the future.
    - Stop both the API and worker processes (`Ctrl+C` in both terminals).
    - Restart them (`npm run dev:api`, `npm run dev:worker`).
    - Show the job is still visible in Bull Board's `delayed` list (Redis AOF persisted it).
    - Wait for it to fire; show it lands in the Sent tab with a fresh Ethereal preview link.
15. **Wrap-up** — mention: Postgres is the source of truth, Redis/BullMQ only handles execution
    timing; the idempotency key (`sha256(campaignId:recipient)`) is both the DB unique constraint
    and the BullMQ job id, which is why steps 14's restart didn't create a duplicate send.
