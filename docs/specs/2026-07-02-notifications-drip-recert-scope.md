# Scope — Notifications system (monthly drip + recertification reminders)

> The last stickiness roadmap piece. Powers (a) the **monthly Toolbox-Talk drip** (hook 3 —
> continuous fresh content) and (b) **recertification / refresher reminders** (hook 1 —
> compliance). Design/scoping only — not yet built.

## What already exists (reuse, do NOT rebuild)
- **Email:** `src/lib/server/email.ts` (`sendEmail`, `isEmailConfigured`) + `transactional-email.ts`
  (welcome, enrolment, team-member-added, CCW templates). Add new templates alongside these.
- **Cron pattern:** `app/api/cron/<name>/route.ts` — `GET` gated by `Authorization: Bearer
  $CRON_SECRET`, with a `DATABASE_URL` guard. Existing: `contact-reply-sla`, `daily-report`,
  `health-check`, `cleanup-old-runs`. **Scheduling** is GitHub Actions `schedule:` workflows that
  curl the route with the secret (pattern in `.github/workflows/*.yml`).
- **In-app bell:** `src/components/lms/NotificationBell.tsx` already consumes
  `GET /api/lms/notifications/me` (`{notifications[], unread_count}`), `POST …/read-all`,
  `PATCH …/:id/read` — currently backed by hardcoded-empty **stubs** in
  `app/api/lms/[[...path]]/route.ts`.
- **Recert/renewal comms:** `src/lib/server/iicrc-renewal-communication.ts`
  (`logRenewalCommunication`, `getRenewalSummaryByEnrollmentIds`, submission status/notes) — the
  IICRC CEC renewal flow. Recert reminders should build on this, not duplicate it.

## Gaps to build
1. **Persistence:** no `Notification` model exists.
2. **Real endpoints** to replace the three stubs.
3. **A notification service** (create/list/mark-read/unread-count) with idempotency.
4. **Two cron jobs** (drip, recert) + their scheduled workflows.
5. **Minimal preferences / unsubscribe** (Australian Spam Act: marketing-style drip needs opt-out).

## Design

### Data model (Prisma)
```
model LmsNotification {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  type       String              // 'toolbox_talk' | 'recert_due' | 'system' ...
  title      String
  body       String   @db.Text
  linkUrl    String?  @map("link_url")
  dedupeKey  String   @unique @map("dedupe_key")  // idempotency: type+subject+period+user
  readAt     DateTime? @map("read_at") @db.Timestamptz(6)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  user       LmsUser  @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, readAt])
  @@map("lms_notifications")
}
```
(v1 preferences: a single `emailOptOut` boolean on `LmsUser`, or a small `LmsNotificationPref`
table. Keep v1 minimal — in-app always; email for recert always, drip respects opt-out.)

### Service — `src/lib/server/notifications.ts`
- `createNotification({userId, type, title, body, linkUrl, dedupeKey, email?})` — upsert by
  `dedupeKey` (idempotent), optionally dispatch email via `sendEmail`.
- `listForUser(userId, {unreadOnly?})`, `unreadCount(userId)`, `markRead(id, userId)`,
  `markAllRead(userId)`.

### Endpoints (replace the stubs)
- `GET /api/lms/notifications/me` → `{notifications, unread_count}` (matches `NotificationBell`).
- `POST /api/lms/notifications/me/read-all`, `PATCH /api/lms/notifications/:id/read`.
Move these OUT of the `[[...path]]` catch-all into real route files.

### Cron — monthly Toolbox-Talk drip
- `GET /api/cron/toolbox-talk-drip` (Bearer `CRON_SECRET`). Pick the current month's talk from a
  rotation over the Toolbox-Talks course modules; for each active team member enrolled in the
  Maintenance/Toolbox courses, `createNotification({type:'toolbox_talk', dedupeKey:
  talk+YYYY-MM+user})` (idempotent) + optional email (respects opt-out).
- Schedule: GitHub Actions `schedule: '0 22 1 * *'` (1st of month) → curl the route.

### Cron — recertification reminders
- `GET /api/cron/recert-reminders` (Bearer `CRON_SECRET`). Daily scan: completed enrolments/certs
  whose recert/refresh is due (reuse IICRC renewal expiry via `getRenewalSummaryByEnrollmentIds`;
  for non-IICRC courses, a configurable refresh interval e.g. 12 months post-completion). Notify at
  **T-30 / T-7 / overdue** (dedupeKey = enrollment+milestone) in-app + email.
- Schedule: GitHub Actions daily.

## Phasing
- **Phase A — foundation:** model + migration, `notifications.ts` service, real endpoints, bell live.
  (Unblocks in-app notifications generally.)
- **Phase B — recert reminders:** recert cron + email template + schedule (compliance value, hook 1).
- **Phase C — monthly drip:** drip cron + rotation + email + schedule (hook 3 continuation).

## Key risk / dependency — prod migration path
CARSI's runner image is pure `node server.js` (Next standalone) — **the deploy does NOT run
`prisma migrate deploy`** (Dockerfile CMD, no entrypoint; runner has no prisma CLI). Adding
`LmsNotification` is a **schema migration that must be applied to prod out-of-band** (CI job or a
manual `prisma migrate deploy` with the prod `DATABASE_URL` + CA cert). **Confirm this migration
path before Phase A** — it's the gating operational question (same class as the quiz-seed issue,
but heavier because it's a schema change, not data). Everything else (service, endpoints, crons,
email, scheduling) is ordinary app code that ships via the normal deploy.

## Estimate
Phase A ≈ 1 PR (model + migration + service + endpoints + bell). Phase B ≈ 1 PR. Phase C ≈ 1 PR.
Each is CI-gated + testable (service/idempotency unit-tested); crons idempotent + Bearer-gated.
