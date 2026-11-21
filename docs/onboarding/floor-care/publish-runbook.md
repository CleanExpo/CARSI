# Publish Runbook — Floor Care Onboarding course

> **Operators:** the authoritative handoff with safety controls (DB snapshot, drift check, the
> `isFree` access-control decision) and the deferred builds is [`../HANDOFF.md`](../HANDOFF.md). This
> file is the concise publish sequence; HANDOFF.md supersedes it for go-live.

How to verify and take the `floor-care-onboarding-operational-readiness` course live. The course is
branded (**CARSI Maintenance Company Onboarding — Professional Floor Care & Operational Readiness**) and
currently `status: published` / `isPublished: true` / `isFree: false` / `priceAud: "99"` in
`data/seed/courses-catalog.json` — so the §1 import **publishes it as a paid A$99 course**. (This
file previously said draft/false, which was wrong.) Set both visibility fields to unpublished in the
catalogue first if you need to seed and smoke-test before it goes live. The production database's
current values have not been verified from the authoring environment — check them first.

> **Why these steps run by an operator, not in the authoring environment:** the live database is
> DigitalOcean Postgres (not Supabase) and the authoring sandbox cannot reach it or run
> `prisma generate` (the engine download is network-blocked). Seeding, smoke-testing and go-live must
> run in an environment that has the production `DATABASE_URL` and network access.

## How publishing works

A course is public when **`isPublished === true` OR `status === 'published'`** (case-insensitive) —
`src/lib/server/public-courses-list.ts`. Production seeding is **manual**: DigitalOcean runs migrations
on deploy but does **not** seed. Seed order matters — the quiz needs its course to exist first.

## Steps

```bash
# 0. Networked environment with the prod DATABASE_URL and a generated Prisma client.
npm ci && npx prisma generate && npm run type-check          # the mandatory gate (blocked in the sandbox)

# 1. Seed the branded course, then its quizzes — ORDER MATTERS.
DATABASE_URL=<prod> npm run db:seed-floor-care-course        # imports this course only. NOT still draft:
#   the importer writes status/isPublished from courses-catalog.json, where this slug is
#   published/true, so this PUBLISHES the course. Set both unpublished first to stage it.
DATABASE_URL=<prod> npm run db:seed-floor-care-quizzes       # creates the 11 LmsQuiz + questions

# 2. Smoke-test the quiz flow with an enrolled student.
DATABASE_URL=<prod> npm run db:seed-e2e-user                 # student@carsi.com.au, enrolled
#    As that student (valid session), for a quizId from data/seed/floor-care-quizzes.json:
#      GET  /api/lms/quizzes/<quizId>           -> 200; questions present; NO correctIndex leaked
#      POST /api/lms/quizzes/<quizId>/attempt   -> 200; { score_percent, passed } honours passPercentage;
#                                                  re-submitting beyond attemptsAllowed -> 409
#    Or run the Playwright suite (Journey 8 covers the quiz): npm run test:e2e

# 3. Go live — choose ONE, then make it durable in git.
#    A) Admin API:  PATCH /api/admin/courses   { "courseIds": ["<course id>"], "published": true }
#    B) JSON:       set status:"published", isPublished:true in courses-catalog.json + re-seed.
#    Whichever you choose, also commit the published state to courses-catalog.json so a future
#    re-seed does not silently unpublish it.

# 4. Verify.
#    Public catalogue (/courses) shows the branded title; open the course; a knowledge-check renders
#    as an auto-marked quiz and scores. Confirm no misleading price (org subscription is provisioned
#    separately — see below).
```

## Pricing / provisioning

- **AUD $1,295/month + GST, unlimited students** — organisation subscription, recorded on the course in
  `meta.pricing` and in `docs/onboarding/README.md`.
- **Individual price: A$99 (`isFree: false`, `priceAud: "99"`) — settled, DECISIONS #55
  (founder, 2026-11-21).** The catalogue is authoritative here. An earlier version of this runbook
  said the course was `isFree: true` / `priceAud: "0"` **on purpose**, so that the catalogue would
  show no one-off buy price; **that claim is withdrawn.** The A$99 list price is correct and the
  course is `published` / `isPublished: true` as committed, so a seed publishes it at A$99 — which
  is intended, not a defect.
  The org-subscription terms in `meta.pricing` are a **separate** commercial track, not a
  contradiction of the list price: recurring billing is still unwired, so those seats are
  provisioned manually. Do not change `isFree`, `priceAud`, `status` or `isPublished` to "reconcile"
  the two.
- Recurring billing (Stripe subscription) is a **separate build** — the Stripe subscription helpers
  exist (`src/lib/api/stripe.ts`) but are not wired to courses/teams.
- When recurring billing is built, update `meta.pricing` (add the Stripe product/price ids) and revisit
  the access model (organisation/team provisioning) at that time.

## Rollback

Unpublish via the admin API (`published: false`) or set `status:"draft"`, `isPublished:false` in the
JSON and re-seed. Quizzes can be re-seeded idempotently at any time.
