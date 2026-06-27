# Handoff — CARSI Maintenance Company Onboarding (go-live + deferred builds)

**For:** Rana (Technical Lead & Manager) · **From:** the authoring work in PRs #220, #221, #222 (all
merged to `main`).

This document is everything that **could not be done in the cloud authoring sandbox** and now needs an
operator with production access and judgement. The sandbox could author and structurally verify
content/data, but it **cannot reach the production database** (DigitalOcean Postgres), **cannot run
`prisma generate`** (the engine binary download is network-blocked), and therefore **cannot seed,
smoke-test, run `type-check` green, or publish**. Those are yours to run, in this order, with the safety
controls below.

> Everything here is reversible and idempotent if you follow the steps. Take a database snapshot first
> (Step 1) and you can always roll back.

---

## 0. What's already done vs what's left

| Done (merged to `main`) | Left for you (this doc) |
| --- | --- |
| Onboarding program docs (`docs/onboarding/floor-care/`) | Run the mandatory `type-check` gate in a networked env |
| LMS course in `data/seed/courses-catalog.json` (12 modules, 38 lessons) | Seed the course + quizzes into the **production** DB |
| 11 structured quizzes (`data/seed/floor-care-quizzes.json`) | Smoke-test the quiz flow against a real DB |
| Branding (CARSI Maintenance Company Onboarding) + `meta.pricing` | Decide access model & **publish** (see the §5 warning) |
| Verified structurally: catalogue guard, branding, quiz integrity, en-AU | Deferred build A: **Stripe subscription billing** |
| | Deferred build B: fill `[COMPANY TO CONFIRM]` placeholders |

**Key identifiers**
- Course slug: `floor-care-onboarding-operational-readiness`
- Course id (for the admin publish API): `6011d465-1981-487b-84e3-a53b10a2bd07`
- Current state in JSON: `status: "draft"`, `isPublished: false`, `isFree: true`, `priceAud: "0"`
- Quiz bank: `data/seed/floor-care-quizzes.json` — 11 quizzes, 34 questions
- Scripts: `db:seed-courses`, `db:seed-floor-care-quizzes`, `db:seed-e2e-user`, `db:export-courses`

---

## 1. Prerequisites & safety (do this first)

1. **Take a production database snapshot/backup** before any seed or publish. This is the rollback of
   last resort.
2. Networked environment with:
   - the production `DATABASE_URL` (and `DATABASE_CA_CERT` if the managed DB needs SSL — see
     `src/lib/prisma.ts`),
   - `npm ci` and a generated Prisma client (`npx prisma generate`).
3. **Prefer staging first.** If a staging DB exists, run the whole runbook there before touching prod.

> ⚠️ **`npm run db:seed-courses` upserts EVERY course in `courses-catalog.json` (all ~23) and replaces
> their modules/lessons to match the committed JSON.** If production has had courses edited via the
> admin UI that are not reflected in the JSON, a seed will overwrite that drift. **Check for drift
> first** (Step 3a). If you only want to touch this one course, see the targeted option in §5.

---

## 2. Run the mandatory verification gate

The Verification Gate requires `npm run type-check` to pass; it could not run in the sandbox (no Prisma
client). Run it in your networked env:

```bash
npm ci
npx prisma generate
npm run type-check          # must be green before seeding/publishing
```

The merged PRs are **data + docs only** (no TypeScript changed), so this should pass; running it is the
gate, not an expected failure.

---

## 3. Seed into production (order matters)

```bash
# 3a. Drift check (recommended): export current prod catalogue and diff against the committed JSON.
DATABASE_URL=<prod> npm run db:export-courses -- --all      # writes data/seed/courses-catalog.json
git diff data/seed/courses-catalog.json                     # review; if drift you don't want overwritten, reconcile
git checkout -- data/seed/courses-catalog.json              # restore the committed (intended) JSON before seeding

# 3b. Seed the course, then its quizzes — the quiz needs its course to exist first.
DATABASE_URL=<prod> npm run db:seed-courses                 # idempotent upsert by slug; course lands as DRAFT
DATABASE_URL=<prod> npm run db:seed-floor-care-quizzes      # idempotent upsert by quiz id; creates 11 quizzes
```

Both seeds are safe to re-run. `db:seed-courses` replaces this course's modules/lessons to match the
JSON; `db:seed-floor-care-quizzes` upserts each quiz by id and replaces its questions.

---

## 4. Smoke-test the quiz flow (against the real DB, before publishing)

```bash
DATABASE_URL=<prod> npm run db:seed-e2e-user                # student@carsi.com.au, enrolled (idempotent)
```

Then, signed in as that student (or with a valid session), for a `quizId` from
`data/seed/floor-care-quizzes.json`:

- `GET /api/lms/quizzes/<quizId>` → `200`; questions returned; **`correctIndex` must NOT be present**
  (answers are server-side only).
- `POST /api/lms/quizzes/<quizId>/attempt` with `{ answers: { "<questionId>": <optionIndex>, … } }` →
  `200` `{ score_percent, passed }`; `passed` honours the quiz's `passPercentage` (90% for the
  safety/reputation-critical modules, 80–85% elsewhere).
- Re-submitting beyond `attemptsAllowed` (3) → `409`.

Or run the Playwright suite (Journey 8 covers the quiz render): `npm run test:e2e`.

> **Known flaky test — not a blocker.** `e2e/pre-production.spec.ts:411`
> (`@authenticated logout … redirects`) intermittently times out on the post-logout redirect. It is
> unrelated to this work (it flaked on #219/#222 and `main` commit #218 tried to stabilise it). Re-run
> the job if you see it; don't let it block a data/docs change.

---

## 5. Publish — and the access-control decision ⚠️

**Read before publishing.** The course is currently `isFree: true` / `priceAud: "0"`. **If you publish
it to the public catalogue as-is, any logged-in user can enrol for free.** That is fine for an internal
pilot, but it is **not** access control for the paid **$1,295/month + GST** organisation subscription.

Choose the model that matches intent:

- **A — Internal/free pilot or manual provisioning (no billing yet):** publish (or keep off the public
  catalogue and provision enrolments per organisation). Access is not metered.
- **B — Paid org subscription enforced:** do **not** rely on a public free publish. Build the
  subscription billing + access gating first (Deferred build A), or provision access per-organisation
  via a team/manual enrolment until then.

To publish (when you've chosen), pick one lever and then make it **durable in git**:

```bash
# Lever 1 — Admin API (immediate DB change; touches ONLY this course):
PATCH /api/admin/courses   { "courseIds": ["6011d465-1981-487b-84e3-a53b10a2bd07"], "published": true }

# Lever 2 — JSON + reseed (durable, but re-syncs the whole catalogue — mind §1 drift warning):
#   set status:"published", isPublished:true on this course in courses-catalog.json, then db:seed-courses
```

A course is public when `isPublished === true` **OR** `status === 'published'`
(`src/lib/server/public-courses-list.ts`). **Whichever lever you use, also commit the published state to
`courses-catalog.json`** so a future re-seed doesn't silently unpublish it.

**Verify:** the public catalogue (`/courses`) shows the branded title and the course opens; a
knowledge-check renders as an auto-marked quiz and scores.

**Rollback:** unpublish via the admin API (`published:false`) or revert `status`/`isPublished` in the
JSON + reseed. Restore the snapshot from Step 1 if anything is wrong.

---

## 6. Deferred build A — recurring subscription billing ($1,295/month + GST, unlimited students)

This was deliberately **not** built (it's app + payments work, not content). The commercial terms are
recorded on the course in `meta.pricing` so nothing is lost.

**Current state of the code (for scoping):**
- Course purchases today are **one-time** Stripe `mode: 'payment'`
  (`app/api/lms/checkout/route.ts`). No recurring billing is wired.
- Stripe **subscription helpers already exist but are unused**: `createSubscription`,
  `getSubscription`, `cancelSubscription` in `src/lib/api/stripe.ts`.
- A team/seat model exists (`LmsTeam`, `LmsTeamCoursePurchase`; tiers in
  `src/lib/lms/pricing-tiers.ts`) but it is **annual, per-seat**, not monthly-unlimited — not a drop-in.

**A minimal build would need:**
1. A recurring **Stripe Price** (AUD 1,295/month; GST handled per your tax config) and a checkout in
   `mode: 'subscription'`.
2. An **organisation/account** entity that owns the subscription and grants its members access to the
   branded course(s) while the subscription is `active` (could extend `LmsTeam` with an "unlimited"
   seat model, or add an org-subscription record).
3. **Webhook handling** for `customer.subscription.created/updated/deleted` and
   `invoice.payment_failed` to provision/deprovision access (extend the existing Stripe webhook
   handler).
4. **Access gating** so the course is granted via active subscription rather than `isFree` — and flip
   the course off `isFree` once gating exists.

Treat this as its own scoped PR with its own plan, tests, and the Verification Gate. Until it exists,
use §5 option A/B for access.

---

## 7. Deferred build B — fill the `[COMPANY TO CONFIRM]` placeholders

The docs use ~60 clearly-marked `[COMPANY TO CONFIRM]` placeholders for CARSI Maintenance Company
specifics that the authoring environment didn't have. The company **name/identity** is already filled
(CARSI Maintenance Company); these remaining ones are operational details. Fill them with your real
values before issuing the pack to staff. Grouped by topic:

- **Fleet & TruckMount:** vehicle list, fit-out, water/power reach — `checklists/vehicle-equipment-pre-start.md`
- **Chemicals & PPE:** approved chemical list, supplier accounts — `checklists/chemical-ppe.md`,
  `checklists/vehicle-equipment-pre-start.md`
- **Maintenance & assets:** asset IDs, service schedule, lube points/intervals, **test-and-tag provider
  & intervals** (state-specific), fault/incident reporting system & contact —
  `checklists/machinery-maintenance.md`, `checklists/chemical-ppe.md`
- **Site procedures:** site sign-in app/process, parking rules, WWC jurisdiction/check requirements —
  `standards/site-cleanliness-security.md`, `standards/professionalism-conduct.md`,
  `checklists/site-arrival.md`
- **Induction & HR:** induction paperwork, escalation contacts, start times — `checklists/staff-induction.md`,
  `02-risk-disruption-matrix.md`
- **Uniform:** uniform spec — `standards/professionalism-conduct.md`
- **L&D cadence:** refresher/re-validation intervals, toolbox-talk cadence, SOP delivery format,
  records system — `03-assessment-framework.md`, `04-pathways-30-60-90.md`,
  `05-implementation-recommendations.md`

Find them all: `grep -rno "\[COMPANY TO CONFIRM[^]]*\]" docs/onboarding`.

---

## 8. Rana's go-live checklist

- [ ] Production DB snapshot taken.
- [ ] `npm run type-check` green in a networked env.
- [ ] Drift check done (§3a); committed JSON is the intended catalogue.
- [ ] `db:seed-courses` then `db:seed-floor-care-quizzes` run against prod (course is in, as draft).
- [ ] Quiz flow smoke-tested (GET hides answers; POST scores; attempts limited).
- [ ] **Access-control decision made** (§5): free pilot / manual provisioning vs build billing first.
- [ ] Published via chosen lever **and** published state committed to `courses-catalog.json`.
- [ ] Public catalogue shows the branded course; a quiz renders and scores.
- [ ] Decisions logged; deferred builds A & B triaged into their own backlog items.

---

_Questions on intent or content are in `docs/onboarding/README.md` (brand) and
`docs/onboarding/floor-care/` (the program). The concise publish sequence also lives in
`docs/onboarding/floor-care/publish-runbook.md`; this handoff supersedes it with the safety controls,
access decision, and deferred-build scope._
