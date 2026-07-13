# CARSI AI Website — production runbook

The AI Website ships as real, flag-gated code in this app. It is **dark by default**: every route and
API returns 404 until you switch it on, so merging/deploying is inert until you decide. This runbook is
the exact sequence to take it live, plus the optional upgrades (live LLM, real email/SMS).

## What shipped (works with zero external services once enabled)

- **Marketing page** — `app/(public)/ai-website/page.tsx` → live at `/ai-website`. Scoped design in
  `ai-website.css`; light/dark follows the site theme.
- **AI Course Advisor** — `app/(public)/ai-website/Advisor.tsx` → `POST /api/ai-website/advisor`. A
  deterministic, catalogue-grounded advisor (`src/lib/ai-website/advisor.ts`) — no LLM key needed; it
  works the moment the flag is on. Licence-correct wording (IICRC CEC Accredited; CARSI designations).
- **Lead capture → CRM** — `LeadMachine.tsx` → `POST /api/ai-website/lead`. Writes a real
  `AiWebsiteLead` row to Postgres and runs the enrolment flow.
- **Enrolment automation** — `src/lib/ai-website/notifier.ts` records each step as an `AiWebsiteEvent`.
  Delivery is behind a provider interface — with no provider configured it records intents only
  (nothing is sent).

Verified locally: `npm run type-check` clean; `npm run build` (see PR/CI). No new dependencies added.

## Go-live sequence

### 1. Apply the database migration (founder-gated — never auto-run against prod)
Two new tables: `ai_website_leads`, `ai_website_events` (models `AiWebsiteLead`, `AiWebsiteEvent`).

```bash
# review first
DATABASE_URL="postgresql://…prod…" npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script

# apply (creates the migration + runs it)
DATABASE_URL="postgresql://…prod…" npx prisma migrate deploy
```
These tables are additive and touch nothing existing — safe. (Production boot applies migrations; it does
**not** seed — consistent with the course-content rule.)

### 2. Flip the flag
Set on the CARSI host (DO):
```
AI_WEBSITE_ENABLED=true
```
`/ai-website` and its APIs go live on the next deploy. Leave unset/false to keep it dark.

### 3. Deploy
`main = prod` (DO deploy-on-push). Merge/deploy as normal; the page appears at
`https://carsi.com.au/ai-website`. Point a friendlier path/subdomain via your host/router if wanted.

### 4. Smoke test
- `GET /ai-website` renders; the advisor answers "I do water damage", "how do CECs work?", "what does it cost?".
- Submit the lead form → an `AiWebsiteLead` row + `AiWebsiteEvent` rows appear; the CRM panel shows the flow.

## Optional upgrades (each is a clean seam — no rework)

### A. Live LLM advisor
The deterministic advisor is the default and is production-safe. To upgrade to a generative advisor,
implement an LLM branch inside `answer()` in `src/lib/ai-website/advisor.ts` (or wrap it in the route),
grounded on the same catalogue + the licence rules in `CLAUDE.md`. No LLM SDK is currently a dependency —
add one (e.g. the Vercel AI Gateway `ai` package or `@anthropic-ai/sdk`) and a server key
(`ANTHROPIC_API_KEY` — note the empty-string gotcha in memory `feedback_env_anthropic_key`). Keep the
deterministic path as the fallback when the key is absent or the call fails.

### B. Real email / SMS (make the automation send, not just record)
In `src/lib/ai-website/notifier.ts`, implement `resolveEmailProvider()` / `resolveSmsProvider()` behind an
env key (e.g. `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`) and add the SDK. The flow already calls the provider
when present and records the same events either way, so switching a provider on needs no other change.

### C. Scheduled dispatch (the +24h SMS / day-2 follow-up)
Time-delayed steps are recorded as intents. Add a cron/worker that selects `AiWebsiteEvent` rows whose
intent is due and dispatches them through the configured provider, then marks them sent. (A `sentAt`/
`scheduledFor` column is the small schema add when you build this.)

### D. Admin surface
The CRM view on the page is the visitor-facing demo of the record. For the team, add an admin list of
`AiWebsiteLead` under `app/(admin)/…` reusing the existing admin patterns.

## Rollback
Set `AI_WEBSITE_ENABLED=false` and redeploy — the route and APIs 404 again. The tables and any captured
leads remain (drop them only deliberately).
