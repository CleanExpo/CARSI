# SPM Spec — CARSI "Next Step Up": Revenue & Credential Integrity Release

> Status: DRAFT for founder acceptance · Author: Claude (SPM, read-only session) · 2026-07-04 · Rev 2: corrected per the §20 adversarial verification addendum
> Base: `main` @ `fbb26155` (clean tree) · Evidence tags: [VERIFIED] repo file:line or GitHub issue read this session · [INFERENCE] reasoned from verified facts · [UNCONFIRMED] assumption needing founder/ops input

---

## 1. Task being planned

Identify and specify CARSI's highest-leverage "next step up" as a decision-grade, dispatchable
programme, with each workstream mapped to the specialised skill that executes it. Founder framing:
"CARSI is a live site, but I know we can do more."

**One-sentence recommendation:** Make everything CARSI sells and certifies real — ship the
membership entitlement engine (#271), gate every CEC certificate on a passing assessment (#301),
and instrument the funnel — because this converts CARSI from a live catalogue into a trustworthy
recurring-revenue credential platform and unblocks both already-approved growth specs.

## 2. Current project context

- Live production LMS at `www.carsi.com.au`, served by DigitalOcean (`monkfish-app` / `carsi-db`),
  ~85 published courses. [VERIFIED issue #293]
- Stack: Next.js App Router + TypeScript strict, Prisma + PostgreSQL, Stripe (one-off `mode:
  'payment'` checkout only), Playwright e2e + vitest + axe a11y in CI, GA4 pageviews, ISR, nonce
  CSP. [VERIFIED `package.json`, `.github/workflows/ci.yml`, `src/components/analytics/GoogleAnalytics.tsx`]
- Recent velocity is high and product-side: reviews + star ratings, notifications Phases A/B/C
  (bell, recert reminders, toolbox drip), AI instructor replies, e2e revenue-path coverage, lint
  promotion. [VERIFIED git log `fbb26155..1cbcce3f` etc.]
- Governance: Compound Engineering loop + verification gate; `npm run type-check` mandatory;
  all course content Australian-produced (230 V/50 Hz, metric, AS/NZS, AUD). [VERIFIED `CLAUDE.md`, `AGENTS.md`]
- Two sibling SPM specs are drafted and queued — both headed "Status: DRAFT for founder
  acceptance", not formally approved: Search Authority (scored 91/100; Phase 0 shipped de facto —
  founder E-E-A-T schema `53a7c8b6`, AI citation-bot allow-list `b55be683`; Phase 1 pending
  acceptance) and Behind Closed Doors members engine (scored 85/100; **explicitly blocked on
  #271**). [VERIFIED
  `docs/specs/2026-07-01-search-authority-geo-aeo.md:88-90`,
  `docs/specs/2026-07-01-behind-closed-doors-members-engine.md:12`]

## 3. Problem statement

CARSI currently sells outcomes its code does not deliver, and certifies competence it does not
assess. Three first-source facts, all re-verified in the working tree this session:

1. **Paid membership is never granted — and cannot currently even be bought.** `/pricing`
   actively advertises `pro_annual` ($795/yr → `/subscribe`) and three Teams tiers ($299 / $799 /
   $2,499 per year, per-seat expansion) [VERIFIED `src/lib/lms/pricing-tiers.ts:39-78`], but the
   subscription status endpoint returns a hard-coded stub — `has_subscription: false` [VERIFIED
   `app/api/lms/[[...path]]/route.ts:76`] — and the subscription checkout endpoint is equally
   stubbed, returning `{url:''}` [VERIFIED `app/api/lms/[[...path]]/route.ts:90-93`], with
   `/subscribe` rendering "Subscription billing checkout is not available in this deployment"
   [VERIFIED `app/(public)/subscribe/page.tsx:87-92`]. The Teams CTA creates a team via
   `POST /api/lms/teams` with no payment step at all [VERIFIED `app/api/lms/teams/route.ts:10-55`].
   No buyer can currently be charged for these tiers: the mis-sell is **advertised dead-end
   products**, not charge-without-delivery (corrected 2026-07-04 — see §20). [VERIFIED issue
   #271, open since 2026-06-29, P1]
   On a live Australian site, advertising memberships that cannot be purchased or delivered
   remains consumer-trust / misleading-conduct exposure, but materially lower than
   charged-without-delivery; the §8 item-6 Stripe-history check closes the question of whether
   any historical charges exist. [INFERENCE]
2. **CEC certificates issue without any knowledge check.** The completion gate passes when "the
   course has no quizzes" [VERIFIED `src/lib/server/lms-completion.ts:36-38`]; issue #301 verified
   live that a 4-CEC-hour course with 10 reading modules and zero assessments issues a CEC
   certificate on click-through. The 2026-05-14 board named quiz-assessed CEC the IICRC moat and
   premium-pricing thesis — "lesson-tick CECs are not defensibly assessed completion". [VERIFIED
   issue #146]
3. **The funnel is unmeasured beyond pageviews.** GA4 emits `page_path` only; no `enrol_click`,
   `checkout_started`, or server-side `purchase` events; no PostHog; no error tracking (no
   Sentry). [VERIFIED `src/components/analytics/GoogleAnalytics.tsx`; issue #128 open; capability
   inventory found no event tracking or error observability]

Compounding effect: the two approved growth engines cannot safely fire. The members engine is
blocked on #271 by its own spec, and the search-authority programme would pour traffic into a
funnel that mis-sells and a credential competitors can attack as unassessed.

## 4. Desired outcome

- Every tier sold on `/pricing` grants exactly the access it promises, server-side, for its paid
  term — individual annual, Teams seats, and the org-monthly model already scoped in
  `docs/plans/2026-06-27-org-subscription-billing.md`.
- No CEC-bearing certificate issues without at least one passing required assessment; every
  published CEC course has an Australian-produced assessment.
- The revenue funnel and entitlement lifecycle are measurable (events + error observability), so
  the step up can be proven with numbers, not claims.
- The members engine and search-authority Phase 2+ become dispatchable the day entitlement lands.
- **Must not happen:** a paying customer locked out of promised access; a paid gate that leaks to
  non-payers; CEC issuance regressing for courses that already have quizzes; any deploy without
  the verification gate.

## 5. Scope

**In scope**
- WS1: Membership entitlement engine (individual `pro_annual`, Teams seats, org monthly), Stripe
  subscription lifecycle webhooks, server-side access gating, self-serve + ops provisioning.
- WS0 (immediate interim): stop the mis-advertising within hours — mark yearly/Teams tiers
  non-purchasable ("coming soon"; if waitlist copy is used, specify the capture destination or
  drop the waitlist promise) until WS1 grants entitlement (issue #271 option 2 as bridge to
  option 1); remove the board-killed $44/$99 monthly SKUs still advertised on `/subscribe`
  [VERIFIED `app/(public)/subscribe/page.tsx:20-33`; board kill: issue #130, CLOSED]; close or
  gate the payment-free team-creation path until WS1-E2 wires purchase → seats.
- WS2: Assessment-gated CEC integrity — audit of published CEC courses lacking quizzes, authoring
  of required assessments (Australian-produced), policy gate so CEC issuance requires ≥1 passing
  required assessment.
- WS3: Funnel + entitlement instrumentation — GA4 events (client `course_view`/`enrol_click`/
  `checkout_started`, server-side `purchase` via Measurement Protocol), PostHog, Sentry (or
  equivalent) error tracking on payment/entitlement/CEC paths.
- WS4 (fast-follow dispatch, not built here): unblock and dispatch Behind Closed Doors Phase 1 and
  Search Authority Phase 2 per their own approved specs.
- Hygiene sidecar (small, bundled): gate `/professional-directory` stub honestly (#298), retire or
  repoint the erroring Vercel `carsi-web` deployment (#293), rotate `carsi-db` doadmin (#289 —
  ops runbook already in the issue).

**Out of scope (this spec)**
- Building the members-engine content pipeline (own approved spec).
- Search-authority Phases 2–5 execution (own approved spec).
- New course content beyond the CEC-gap assessments (S540/S900/S800 + RIA catalogue expansion is
  issue #296 — a strong later candidate, sequenced after credential integrity).
- Video hosting/CDN, full-text search, mobile/PWA (real gaps per capability inventory, lower
  leverage than revenue/credential integrity now).

**Non-goals:** re-platforming payments; introducing monthly individual subscriptions (board locked
"kill monthly" — #130/#146 Q4); building a new CMS.

**Assumptions:** [UNCONFIRMED] founder confirms #271 option 1 (implement entitlement) with option
2 as the interim; [UNCONFIRMED] founder/ops create the recurring Stripe Prices (annual individual,
Teams tiers, org monthly) in the live Stripe account; [UNCONFIRMED] SME (founder) reviews authored
assessments before publish.

**Constraints:** live production — every phase behind the verification gate
(`docs/agent-framework/CARSI_VERIFICATION_GATE.md`), `npm run type-check` mandatory; `carsi-db`
firewalled locally (writes via app/admin API); course/assessment content Australian-produced per
`CLAUDE.md`; entitlement gate must fail closed.

## 6. Existing capability review (do not rebuild)

| Capability | State | Evidence |
|---|---|---|
| Stripe one-off checkout + refund/dispute revocation | Working | `app/api/lms/webhooks/stripe/route.ts` (`checkout.session.completed`, `revokeEnrollmentsByPaymentReference`) |
| Stripe webhook idempotency | Working | `StripeWebhookEvent` model; `scripts/test-stripe-webhook-idempotency.mjs` |
| Stripe **subscription helpers — built, unused** | Reuse | `createSubscription`/`getSubscription`/`cancelSubscription` in `src/lib/api/stripe.ts` [VERIFIED via `docs/plans/2026-06-27-org-subscription-billing.md`] |
| Team/seat data model + APIs | Schema + API done, UI thin | `LmsTeam`, `LmsTeamMember`, `LmsTeamInvite`, `LmsTeamCoursePurchase`; `/api/lms/teams/*`; `/admin/yearly-membership` |
| Org-monthly billing design | Scoped plan ready | `docs/plans/2026-06-27-org-subscription-billing.md` (data model, webhook, gating, admin — recommended approach already written) |
| Quiz engine + pass-gated completion | Working where quizzes exist | `LmsQuiz*` models; `src/lib/server/lms-completion.ts`; admin quiz-lesson authoring shipped (`a62bca01`) |
| Certificate + CEC submission pipeline | Working | cert PDF, `LmsIicrcCecSubmission` + audit trail, recert reminder cron |
| e2e revenue-path suite | Working, extend | `e2e/revenue-path.spec.ts` (pricing + authenticated learner, PR #346) |
| GA4 component | Pageviews only | `src/components/analytics/GoogleAnalytics.tsx` |
| Entitlement check | **Stub — the gap** | `app/api/lms/[[...path]]/route.ts:76` `has_subscription: false` |

Stale items knowingly excluded: the 2026-03-22 audit's P0s (catalogue auth-gating, missing
/terms・/privacy, 21-course count) are resolved on current main [VERIFIED footer/terms commit
`0a14b598`, ISR commit `d27a1d22`, 85 live courses per #293]; issue #135 (contact silent drop) is
superseded — `/api/contact` now sends transactional email with Turnstile + rate-limit + CRM sync
[VERIFIED `app/api/contact/route.ts`].

## 7. Specialist board (15+ yr perspectives, condensed)

- **Product Manager:** The step up is trust monetised. Recurring revenue (annual + Teams + org)
  is already designed and half-modelled; shipping it converts existing pricing-page demand into
  retained ARR and unblocks the retention engine (members content). Sequence WS0 today — selling
  undeliverable access is compounding brand damage.
- **Software Architect:** Do not invent a parallel entity — extend `LmsTeam` per the org-billing
  plan; add an individual subscription record; single `getEntitlements(userId)` service consumed
  by enrolment, course APIs, quiz APIs, and the members gate later. Extend the existing webhook
  handler (`customer.subscription.*`, `invoice.*`) under the existing idempotency table. One
  entitlement source of truth or the members engine inherits a second stub.
- **UX Reviewer:** Three surfaces need honest states: `/pricing` (purchasable vs coming-soon vs
  owned), `/subscribe` + `/dashboard/team` (active/past-due/lapsed/seat-full), and learner course
  cards ("included in your membership"). Lapse must degrade gracefully — retain progress, gate new
  access, never strand a learner mid-course. Post-purchase must land in the first unlocked course.
- **Security Reviewer:** Entitlement checks server-side in route handlers and data APIs — never
  client-only (IDOR/paid-content leak). Fail closed on uncertainty. Webhook remains
  signature-verified + idempotent. Bundle the #289 doadmin rotation (runbook in issue) and #293
  dead-deployment retirement into this release's ops window; both reduce credential/config attack
  surface.
- **QA/Test Lead:** Extend `e2e/revenue-path.spec.ts` with subscription paths (Stripe test clock
  for lapse), unit-test the entitlement decision function pure (mirroring `lms-completion.ts`
  style), and add the CEC policy test: zero-assessment course must NOT issue a CEC cert. The
  capability inventory found no quiz-scoring or seat-allocation tests — both become mandatory here.
- **Devil's Advocate:** "Why not growth first — SEO is scored 91?" Because the members engine is
  blocked on #271 by its own spec, and traffic multiplied into a mis-selling funnel multiplies
  refunds and ACL risk, not revenue. "Why not content expansion (#296)?" A bigger catalogue of
  unassessed CEC certs deepens the moat problem it should fix. "Is WS2 scope-creep on WS1?" No —
  they share one theme (sell/certify only what is real) but are independently shippable; the
  phasing below keeps them separate PR streams.

## 8. Judge challenge

| Category | Score | Notes |
|---|--:|---|
| First-source evidence | 25/25 | Every load-bearing claim re-verified in-tree this session (file:line above); stale findings excluded — §20 records one §3.1 claim later contradicted and corrected |
| Clear problem, real users | 20/20 | Live mis-sell (P1 #271), live credential-integrity failure (#301), measured-zero funnel (#128) |
| Reuse over rebuild | 14/15 | Subscription helpers, team models, idempotency, org-billing design, quiz engine all reused; −1: entitlement service is genuinely new code |
| Security | 14/15 | Server-side fail-closed gate, existing webhook hardening; −1 residual: Stripe lifecycle edge-cases (past_due grace) need explicit decision |
| UX | 9/10 | States enumerated; −1: lapse-experience copy needs founder tone pass |
| Testability | 10/10 | Pure decision fn + e2e revenue path + test-clock lapse + CEC negative test — all executable in CI |
| Cost/simplicity | 4/5 | Three billing faces is a real programme; phased E1→E3 keeps each shippable; −1 inherent breadth |
| **Total** | **96/100** | |

**Decision: REDUCE SCOPE → phase it.** Per the hard line, 96 is not a build authorisation for the
whole programme. The honest ceiling as-written is 96/100; the missing 4 points are closable only
by founder/ops input, not by more analysis:
1. Lock #271 option 1 (implement entitlement) with option 2 as the WS0 interim — founder decision.
2. Create the recurring Stripe Prices (annual individual, 3 Teams tiers, org monthly $1,295+GST)
   in the live account and record ids — founder/ops action.
3. Decide the past-due grace policy (recommend: 7-day grace, then gate) — founder decision.
4. Commit SME review of authored CEC assessments before publish — founder commitment.
5. Decide GST treatment for the new annual/Teams recurring Prices — inclusive pricing vs Stripe
   Tax (live `/subscribe` copy says "GST included"; the org-monthly plan doc discusses both) —
   founder decision. [Added by the 2026-07-04 verification pass]
6. Run the 2-minute Stripe-dashboard history check confirming zero historical yearly/Teams
   subscription charges (expected zero — the subscription checkout was never wired; §3.1) —
   founder/ops action. [Added by the 2026-07-04 verification pass]

With those six locked, **Phase E1 (WS0 + individual annual entitlement) is build-ready**. The
"re-scores 100/100" framing in the first revision was directional, not derived — the residual
judge deductions (lapse-copy tone pass; Stripe lifecycle edge-cases) close via decision 3 and
the E1 UX pass, and closure of the decisions ticket (Linear GP-439) is the operative gate. E2
(Teams) and E3 (org monthly) each re-judge at phase start. WS2 and WS3 remain approved as
specified (no external blockers; WS2 publish step is SME-gated by design).

## 9. Proposed solution (phased)

**WS0 — Stop the mis-sell (hours, ships first).** On `/pricing`, mark `pro_annual` and Teams tiers
non-purchasable ("Coming soon — join the waitlist") until entitlement exists; keep per-course
purchase untouched. Reversible copy/flag change; unblocks nothing downstream but caps liability
immediately.

**WS1-E1 — Individual annual entitlement.** `LmsSubscription` record (user, stripeCustomerId,
stripeSubscriptionId, status, currentPeriodEnd); checkout in `mode: 'subscription'` on the new
annual Price; webhook lifecycle upserts; `getEntitlements()` service returns
`{ hasActiveMembership, entitledCourseIds | ALL }`; replace the `[[...path]]` stub with the real
check; gate enrolment/course/quiz APIs; `/subscribe` + student dashboard reflect real status;
re-enable the tier on `/pricing`.

**WS1-E2 — Teams entitlement.** Wire the existing `LmsTeam*` models to seat-based entitlement:
purchase → team + seats provisioned; invites consume seats; member entitlement = active team
purchase; owner dashboard shows seats/usage (UI exists thin — complete it). Re-enable Teams tiers.

**WS1-E3 — Org monthly (Maintenance onboarding).** Execute
`docs/plans/2026-06-27-org-subscription-billing.md` as written: `seatModel: 'unlimited'`, monthly
recurring Price, subscription lifecycle webhooks, flip course off `isFree` once gated.

**WS2 — CEC assessment integrity (parallel to WS1).** (a) Read-only audit: enumerate published
CEC-bearing courses with zero required quizzes; (b) author assessments for each (Australian
English, AS/NZS framing, per `carsi-course-production`), SME-reviewed, published via admin quiz
authoring; (c) policy gate: CEC certificate issuance requires the course to have ≥1 required
assessment AND a passing attempt — change lands only after (b) covers published courses, so no
learner is stranded uncertifiable.

**WS3 — Instrumentation (parallel, small).** GA4 events client-side; server-side `purchase` +
`subscription_started`/`renewed`/`lapsed` via Measurement Protocol from the webhook; PostHog
funnel; Sentry on payment/entitlement/CEC server paths.

**WS4 — Growth dispatch (after E1).** Flip the members-engine spec from blocked → build (its own
Phase 1), and dispatch Search Authority Phase 2 per its approved spec. No new design here.

**Failure/rollback:** each phase its own PR stream behind the verification gate; entitlement gate
ships dark behind a flag until e2e passes against Stripe test mode; rollback = revert PR + tiers
back to WS0 coming-soon state; webhook changes are additive event handlers (existing one-off flow
untouched).

## 10. Workstream → specialised-skill dispatch map

| # | Workstream | Executing skill(s) | Verifying skill(s) |
|---|---|---|---|
| WS0 | Coming-soon interim on unsold-able tiers | `fix` (surgical copy/flag change) | `verify` + screenshot |
| WS1 | Entitlement engine (E1→E3) | `plan` → `feature-dev` (architecture per §9; org plan doc as input) | `security-audit` (server-side gate, IDOR, webhook), `test-writer` agent (e2e + unit), `verify-test`, `proof-discipline` (no vacuous green — test-clock lapse must really lapse) |
| WS2a | CEC zero-assessment audit | `researcher` agent (read-only enumeration) | `judge` (verdict on policy change) |
| WS2b | Assessment authoring | in-repo `carsi-course-production` skill (Australian-produced standard) | founder/SME review (HITL), `test-writer` for the negative CEC test |
| WS3 | GA4 events + PostHog + Sentry | `feature-dev` (small) | `verify` (GA4 realtime + PostHog event + forced-error in Sentry) |
| WS4a | Members engine Phase 1 | its own spec (`2026-07-01-behind-closed-doors-members-engine.md`) + `design-audit` for teaser/paywall UX | per that spec |
| WS4b | Search Authority Phase 2 | its own spec + `seo-audit`, `seo-schema`, `seo-sitemap`, `seo-geo`, in-repo `search-dominance` | `seo-technical` re-crawl |
| Sidecar | #298 directory gating · #293 retire Vercel · #289 rotate doadmin | `fix` (directory) · ops runbooks already written in issues #293/#289 | `security-audit` sign-off |

Note (2026-07-04): `test-writer`, `researcher`, and the other named executors are Claude-Code
session agents/skills supplied by the dispatching harness — they are not defined in this repo's
tree. The dispatcher owns providing them; in-repo skills (`carsi-course-production`,
`search-dominance`) were verified present.

## 11. UX requirements (essentials)

- `/pricing`: three truthful tier states — purchasable / coming-soon (WS0) / "your plan".
- `/subscribe` + `/dashboard/team`: active, past-due (grace banner), lapsed (renew CTA, progress
  retained), seat-full (expand CTA). Empty/loading/error states on all new surfaces.
- Post-subscribe: land on catalogue with "included in your membership" affordance; post-course
  purchase behaviour unchanged.
- Lapse: never blocks a certificate already earned; gates new enrolments only.
- Learner-facing assessment addition (WS2): course pages show "includes graded assessment" so the
  CEC value-add is visible, not silent friction.

## 12. Technical requirements

- New: `LmsSubscription` model (+ migration), entitlement service (`src/lib/server/entitlements.ts`,
  pure decision core split like `lms-completion.ts` for unit testing), subscription checkout route
  (separate from one-off checkout), webhook handlers for `customer.subscription.created|updated|
  deleted`, `invoice.paid|payment_failed` under existing idempotency.
- Modified: `app/api/lms/[[...path]]/route.ts` (replace stub), enrolment/quiz/course-access APIs
  (consume entitlement service), `src/lib/lms/pricing-tiers.ts` + `PricingTiers.tsx` (states),
  student dashboard, team dashboard, `lms-completion.ts`/certificate route (WS2 policy gate),
  `GoogleAnalytics.tsx` + webhook (WS3 events).
- Env/ops: Stripe Price ids (founder-created) as env/config; Sentry DSN; PostHog key. No
  local prod-DB access — migrations via the existing DO PRE_DEPLOY migration job [VERIFIED
  `111386f0`].

## 13. Security & privacy

- Entitlement checked server-side at route AND data-API layer; fails closed; no client-only gating.
- Webhooks: signature verification + `StripeWebhookEvent` idempotency retained for new event types.
- No card data touches CARSI (Stripe-hosted checkout, unchanged).
- Sidecar closes two standing exposures: doadmin credential rotation (#289 runbook — sequence
  matters, `DATABASE_URL` is a manual app-level env var) and the erroring Vercel deployment
  pointed at the wrong database (#293 — retire or repoint decision, recommend retire given DO is
  sole serving path).
- WS2 raises credential defensibility (assessed CEC) — a compliance asset with IICRC.

## 14. Verification plan + loop/stress testing

**Static:** `npm run type-check`, lint, build — every PR (existing CI).
**Unit:** entitlement decision function (active/past-due-in-grace/lapsed/none, seat exhaustion);
CEC policy function (zero-assessment ⇒ no cert; passing ⇒ cert; regression: existing quiz courses).
**e2e (Stripe test mode):** extend `e2e/revenue-path.spec.ts` — subscribe → catalogue access
granted; test-clock advance → lapse → new enrolment blocked, progress retained; Teams: purchase →
invite → seat consumed → member entitled; org: subscription active → unlimited enrol, canceled →
suspended.
**Stress/abuse:** non-member hits gated API directly → 401/403 (never data); replayed webhook →
single grant (idempotency); refund/dispute on subscription → revocation parity with existing
one-off flow; concurrent seat claims at limit → exactly seatLimit granted; gate outage/uncertain
state → deny (fail closed).
**WS3 proof:** sandbox purchase produces GA4 `purchase` with course slug + PostHog event; forced
server error appears in Sentry.
**Evidence before "done":** each phase closes with test output + a verification note on the PR,
per the Compound Engineering gate; #332's ledger discipline applies — no Done without merge
evidence.

## 15. Acceptance criteria (Given/When/Then)

1. Given a visitor on `/pricing` or `/subscribe` before WS1-E1 ships, when they view membership
   options, then no purchasable-looking CTA is presented for an entitlement the system cannot
   grant, and the board-killed $44/$99 monthly SKUs are absent (WS0).
2. Given a user completes Stripe checkout for `pro_annual`, when the webhook processes, then
   `/api/lms/subscription/status` reflects an active subscription and every published course is
   enrollable by that user without further payment.
3. Given an active subscriber whose subscription passes `currentPeriodEnd` + grace, when they
   attempt a new enrolment, then it is blocked with a renew CTA, and their existing progress,
   enrolments, and issued certificates remain intact.
4. Given a Teams Starter purchase (5 seats), when a 6th invite is accepted, then it is rejected
   with a seat-expansion path, and exactly 5 members hold entitlement.
5. Given a non-entitled authenticated user, when they call any entitlement-gated API directly,
   then the response is 401/403 with no course-content payload.
6. Given a published CEC-bearing course with zero required assessments, when a learner completes
   all lessons, then no CEC certificate issues (and after WS2b, no published CEC course is in
   this state). Sequencing note: until WS2b coverage completes, this criterion is proven by
   unit/e2e fixture tests only — the production gate must not ship early and strand learners.
7. Given a learner passes the required assessment, when completion evaluates, then the certificate
   and IICRC CEC submission pipeline behave exactly as today (no regression).
8. Given a sandbox subscription purchase, when the webhook fires, then GA4 records `purchase` and
   PostHog records the funnel event within 60s, and an induced handler error is visible in Sentry.
9. Given all of E1 shipped, when the members-engine spec is re-read, then its #271 blocker is
   closed and its Phase 1 is dispatchable unchanged.
10. Given any phase PR, when CI runs, then type-check, unit, e2e, and a11y pass, and the PR body
    carries the verification note (gate evidence).

## 16. Goal command

```
/goal Execute docs/specs/next-step-up.spec.md phase-by-phase: WS0 immediately (coming-soon interim
on pro_annual + Teams tiers); then WS1-E1 individual annual entitlement per §9/§12 with the §14
verification plan; WS2a/WS2b and WS3 in parallel PR streams; E2, E3, then WS4 dispatch. Blockers
to resolve with founder before E1 code: the six GP-439 inputs (#271 option lock, Stripe Price
ids + env names, grace policy, SME assessment review, GST treatment, Stripe-history zero-charge
check). Every phase: verification gate + type-check + evidence note. Do not
start E2 until E1 acceptance criteria 2/3/5 pass in CI.
```

## 17. Implementation sequence

1. Founder locks the six decisions (§8; Linear GP-439) — ~20 minutes, unblocks everything.
2. WS0 interim (hours) → deploy.
3. WS1-E1 (est. 2–3 days per #271) ‖ WS2a audit (half-day) ‖ WS3 (day).
4. WS2b assessment authoring (SME-paced) → WS2c policy gate.
5. WS1-E2 Teams (days) → WS1-E3 org monthly (days, plan doc ready).
6. Sidecar ops window: #289 rotation, #293 retirement, #298 directory gating.
7. WS4: dispatch members-engine Phase 1 + Search Authority Phase 2 per their specs.

## 18. Session-handoff seed

- **State:** read-only SPM session on `main` @ `fbb26155`; only artefact written:
  `docs/specs/next-step-up.spec.md`. Nothing deployed, migrated, committed, or mutated.
- **Verified anchors for the builder:** stub `app/api/lms/[[...path]]/route.ts:76`; tiers
  `src/lib/lms/pricing-tiers.ts:39-78`; completion gate `src/lib/server/lms-completion.ts:36-46`;
  quiz-gate context `src/lib/server/enrollment-service.ts:8-187`; org plan
  `docs/plans/2026-06-27-org-subscription-billing.md`; webhook
  `app/api/lms/webhooks/stripe/route.ts`; e2e base `e2e/revenue-path.spec.ts`.
- **Open founder inputs:** the six §8 items, tracked as Linear GP-439. **Pickup point:** §17
  step 1. Programme backlog: Linear GP-439…GP-450 (project CARSI, team GP).
- **Stale-issue note for triage:** #135 superseded by current `/api/contact`; #128 half-done (GA4
  pageviews exist; events/PostHog remain); 2026-03-22 audit P0s resolved on current main.

## 19. Final recommendation

**Build the Revenue & Credential Integrity release as the next step up** — WS0 today, then
phased E1→E3 entitlement with parallel CEC assessment gating and funnel instrumentation — because
it is the only candidate that simultaneously removes live legal/trust exposure, turns the pricing
page into real recurring revenue using designs and models that already exist in the repo, makes
the IICRC credential defensible (the stated moat), and unblocks both growth specs already drafted and
queued (founder acceptance pending — see §2). **Runners-up:** (2) Search Authority Phase 2 + members engine first — rejected
as first move because the members gate is blocked on #271 and amplified traffic amplifies the
mis-sell; dispatched instead as WS4 fast-follow. (3) Catalogue expansion to S540/S900/S800 + RIA
(#296) — high-value but sequenced after credential integrity so new CEC courses launch assessed.

*Honest ceiling as-written: 96/100 (REDUCE SCOPE → phase). Phase E1 becomes build-ready the
moment the six founder inputs in §8 (Linear GP-439) are locked; no further analysis is required.*

## 20. Adversarial verification addendum (2026-07-04)

After authoring, this spec was verified by three independent agents (code-evidence,
GitHub-issue, fresh-eyes critique) plus a live crawl of carsi.com.au. Outcomes:

- **Confirmed:** all three §3 code anchors (status stub `route.ts:74-82`; tiers
  `pricing-tiers.ts:39-83`; zero-quiz completion via `lms-completion.ts:41-48` +
  `enrollment-service.ts:13,174-176`); issues #271/#301 open and as characterised; #135
  stale-superseded; #128 half-done; live /pricing sells the cited tiers; live-site constraint
  check passed (no ungated destructive step anywhere in the plan).
- **Corrected in Rev 2:** §3.1 charge-without-delivery claim (subscription checkout is also
  stubbed — no money can be taken; the mis-sell is advertised-dead-end, and the Teams CTA
  creates teams with no payment step); §2/§19 "approved" sibling specs → DRAFT for founder
  acceptance (Search Authority Phase 0 shipped de facto only); §8 founder decisions extended
  from four to six (GST treatment; Stripe-history zero-charge check); "re-scores 100/100"
  reframed as directional; WS0 scope extended to the board-killed $44/$99 monthly SKUs on
  `/subscribe` (#130) and the payment-free team-creation path; §15 AC1 broadened and AC6
  sequencing clarified; §10 executor-availability note added.
- **Known residuals:** the issue #146 board quote is taken on trust (not verifiable in-tree);
  the E2 seat-expansion billing mechanism (Stripe quantity vs per-seat Price, proration) must
  be designed on Linear GP-442 before build; production /pricing still renders Foundation
  ($44/mo) and Growth ($99/mo) SKUs with card-capturing trials despite the #130 board kill —
  deployed-vs-repo drift to be confirmed and resolved inside Linear GP-440.
- **Tracking:** the programme is dispatched as Linear **GP-439…GP-450** (project CARSI, team
  G-Pilot); GP-439 (the six §8 inputs) is the operative gate. Base note: this file's initial
  commit `72ff4153` was auto-pushed by a local "autogit" daemon atop the analysed base
  `fbb26155`; Rev 2 is the first deliberate, reviewed revision.
