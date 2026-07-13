# SPM spec — CARSI (Online Training LMS) security remediation (2026-07-12)

> Decision-grade `/spm` spec. Read-only inputs; authorises no write on its own. Source: the
> 2026-07-12 10-dimension read-only audit of `CleanExpo/CARSI` (`D:/CARSI`, working tree on
> `test/gp-463-…`; `origin/main 3fbeb3a0`). Stack: Next.js 16 + React 19 + **Prisma/Postgres**,
> deployed on **DigitalOcean App Platform** (monkfish, Cloudflare-fronted, carsi.com.au), AI via
> **OpenRouter**. Tier **T3** (security-critical, live paid product with learner PII).

---

## 1 Task

Close **four P0 security holes** in the live LMS — an unauthenticated **account-takeover**, an
**AI-provider/env drift** that repeats the Margot outage, a **refund/revocation paywall+certificate
bypass**, and a **public PII-leaking credential endpoint** — plus the high-value P1s (cron fail-open,
AI self-judge, data-model cascade hazards, PII-in-logs, CORS fallback). CARSI is otherwise
well-built; this is surgical, not a rebuild. Prod DB/migrations land via the repo's PRE_DEPLOY
migrate job; DB-state claims are `{gated}` (DO Postgres, not queryable from here).

## 2 Project context

- **Product.** CARSI — a paid Australian Online Training LMS (learners, enrolments, quizzes, IICRC
  CEC compliance records, Stripe payments) + a dark-launched AI advisor/lead-CRM site.
- **Auth.** Custom HS256 JWT (`jose`) — `auth_token`/`carsi_token` httpOnly cookies with `{sub,email,
  role}`; a separate admin cookie; `proxy.ts` (Next 16 middleware) + per-route API guards. Roles
  `student|instructor|admin` + an admin email allow-list. **Identity is taken from `claims.sub`, never
  client input** (IDOR-resistant).
- **Deploy.** DigitalOcean App Platform (`app.yaml`, `Dockerfile`); a blocking forward-only PRE_DEPLOY
  `prisma migrate deploy` job; DB TLS enforced. Prior prod incident: the DO app lacked
  `OPENROUTER_API_KEY` after the Anthropic→OpenRouter migration → the "Margot" AI 504'd.
- **Standing posture.** Materially solid: Stripe webhook signature + event-ID idempotency +
  out-of-order guard; entitlement enforced server-side fail-closed; checkout price DB-derived; quiz
  answers never leak + race-safe; JWT secret fails-closed in prod; CI enforces type/lint/test.

## 3 Problem statement (audit-verified, file:line)

1. **P0-A — Unauthenticated account takeover (guest-free enrolment).** `POST /api/lms/enrollments/
   guest-free` is fully unauthenticated and forwards a caller-supplied `email`+`password` into
   `findOrCreateGuestUser()`; when the email already belongs to a learner (incl. an admin), it
   **overwrites the victim's `hashedPassword`** and returns a valid session which the route signs into
   cookies → **takeover + lockout of any account whose email is known**. No Turnstile/rate-limit on
   this route (unlike contact/lead capture). The password-overwrite primitive is also reachable via
   `guest-complete` (partly shielded by a Stripe `session_id`). *(`src/lib/server/guest-checkout.ts:22-34`;
   `app/api/lms/enrollments/guest-free/route.ts:15-59`)*
2. **P0-B — AI-provider / env drift (repeat Margot).** The public chat path is **hardcoded to
   `ANTHROPIC_API_KEY` / `api.anthropic.com`** despite the platform's OpenRouter migration; `app.yaml`
   declares `OPENAI`, the readiness monitor names `OPENROUTER/OPENAI` — three disagreeing sources.
   There is **no fail-loud boot validation** of the AI keys/Stripe (only a `console.warn`), and the DO
   **health check is a static always-`healthy` 200** that verifies nothing, so a missing key or DB
   passes the deploy gate. This is the Margot outage class baked into config. *(api-routes + secrets-env-do)*
3. **P0-C — Refund/revocation paywall + certificate bypass.** A refund/chargeback revocation is
   **silently reverted and the certificate re-issues**, and **revoked/cancelled enrolments retain full
   lesson + quiz access** — paid content stays open after refund. *(payments-entitlements)*
4. **P0-D — Public credential endpoint leaks PII + unrevocable certs.** An unauthenticated credential
   JSON/PDF exposes a **learner's full name by enrollment UUID**, with no auth, rate-limit, expiry, or
   revocation. *(api-routes + data-pii-protection)*

High-value P1s: cron auth accepts `Bearer undefined` when `CRON_SECRET` unset (Margot class); the AI
contact-reply **auto-send trusts a self-asserted "judge verdict" from the same credential that drafts
it**; `enrollments/confirm` skips the Stripe-email ownership check when the JWT has no email claim;
**Prisma cascades** destroy a whole team (+subscription) on owner delete and **erase IICRC CEC
regulatory records** on learner/enrolment delete; free-text status columns (no enum/CHECK) feed
entitlement logic; no `DIRECT_URL` (latent RA-1807); unindexed FKs; **learner emails written to prod
logs**; no retention/erasure path for lead-CRM PII; CORS falls back to `localhost:3000` **with
credentials** when the env is unset; secret-scan is only a bypassable pre-commit hook (not CI).

Positives (do not regress): centralized proxy + per-route guards; JWT fail-closed; IDOR-resistant
(no IDOR found); Stripe integrity; quiz integrity; AI advisor cost/abuse controls + injection
resistance + fail-safe missing-key; lead-CRM reads admin-gated; enrolment automation signature-
verified/idempotent; dark-launched AI site (404 until flagged); CI quality gate; nonce CSP + headers.

## 4 Desired outcome

- No unauthenticated path can mutate an existing account or mint its session; guest enrol creates
  **only brand-new** users; guest-complete binds strictly to the Stripe-verified payer email.
- One AI provider of record (**OpenRouter**) across code + `app.yaml` + monitor; **fail-loud boot
  validation** of required prod env; the health check verifies real dependencies (or stops lying).
- Revocation **persists**; a revoked/cancelled enrolment loses content + quiz access and does not
  re-issue a certificate.
- The credential endpoint requires auth or a signed, expiring, revocable token and stops leaking PII.
- The P1 data-model + operational hazards are closed; the audited positives stay green.

## 5 Scope

### IN (release-blocking security core)
- **WS1** P0-A account-takeover fix (guest-free/guest-complete + Turnstile/rate-limit).
- **WS2** P0-B AI-provider + env correctness + fail-loud boot validation + real health check.
- **WS3** P0-C refund/revocation integrity (persist revocation; revoked → no access, no cert).
- **WS4** P0-D credential endpoint auth/token + PII.
- **WS5** P1 security: cron fail-closed; AI reply self-judge → independent/human gate; confirm
  email-claim gap; CORS localhost-credentials fallback; CI secret-scan gate.
- **WS6** P1 data-model + ops: Prisma cascade → restrict/soft-delete (team-owner + **IICRC CEC
  regulatory records**); status enums + CHECK; `DIRECT_URL` separation; FK indexes; `isPublished`
  cleanup; PII-in-logs; lead-CRM retention/erasure.

### OUT (owner decision / separate)
- DO **region/data-residency** (blr→AU) — infra/legal owner decision; remove the latent **Vercel
  split-brain** config; delete the dead workflow subtree (reactflow/xyflow/yjs) — hygiene.

## 6 Existing capability review

| Capability | Exists as | Gap |
|---|---|---|
| Fail-loud secret | `src/lib/auth/jwt-secret.ts` (throws in prod) | The AI-key/Stripe path lacks the same → WS2 mirrors it |
| Bot/rate protection | Turnstile + per-IP limit on contact/lead routes | guest-free has neither → WS1 adds it |
| Stripe webhook | signature + event-ID idempotency + out-of-order guard | Correct — reuse for WS3 revocation |
| Session ownership | `getSessionClaimsFromRequest` (claims.sub) | The pattern WS4 credential endpoint should adopt |
| Entitlement check | server-side fail-closed on enrol paths | Doesn't cover the revoked/refunded state → WS3 |
| PRE_DEPLOY migrate | blocking forward-only job | The place WS6 migrations land; add DIRECT_URL |

## 7 Specialist board receipt

- **Tier T3.** Axes F2 I2 N1 X2 S2. Evidence base = the 10-dimension read-only audit
  (`wf_f84795ad-cce`, all findings file:line-cited, 3 dimensions independently converged on P0-A).
- **Bench: T0 / inline** (no separate MOA bench convened for this spec) — the audit is the fresh
  first-source verification and it is unusually deep + cross-corroborated; the judge rubric is applied
  inline (§8). Honest receipt: findings are first-source (repo file:line); DB-state claims are `{gated}`
  pending live verification via the deploy/CI path (DO Postgres not queryable here).
- **Adversarial verify: PENDING** — recommended before build (§19), especially the P0-A fix (avoid
  user-enumeration) and the P0-C revocation state machine.

## 8 Judge challenge (inline)

- **P0-A is the keystone — fix first, non-DDL, code-only.** It's directly exploitable and needs no
  gate. **Avoid user enumeration** in the fix (neutral "please sign in" for existing emails).
- **P0-B: one provider of record.** Don't add a key — reconcile code+`app.yaml`+monitor to OpenRouter
  and fail loud; the deceptive always-200 health check must verify a real dependency or be honest.
- **Reader-proof P0-C:** revocation must be enforced at the entitlement read (the single choke point),
  not just at cert issue — audit the read path.
- **Don't over-scope:** DO region + dead-code + Vercel-config are OUT (not exposure-closing); the
  IICRC CEC cascade is a **regulatory-record-loss** risk — treat as P1 must-fix (soft-delete/restrict).

## 9 Proposed solution (workstreams)

**WS1 — P0-A account takeover (code).** In `findOrCreateGuestUser` (`src/lib/server/guest-checkout.ts`):
if the email already exists, **do NOT** update the password and **do NOT** return an authenticated
session — return a neutral "account exists, please sign in" result (generic, no enumeration). Only
set a password / issue a session for brand-new users. In `guest-complete`, bind the session strictly
to the **Stripe-verified payer email**. Add **Turnstile + per-IP rate-limit** to
`app/api/lms/enrollments/guest-free/route.ts` (mirror the contact route).

**WS2 — P0-B AI provider + env (code + config).** Route the public chat/AI path through **OpenRouter**
(the platform provider) instead of the hardcoded `ANTHROPIC_API_KEY`/`api.anthropic.com`; reconcile
`app.yaml` (`OPENAI`→`OPENROUTER_API_KEY`) and the readiness monitor to one provider of record. Add a
**fail-loud boot validation** (mirror `jwt-secret.ts`) that throws in production when the AI key /
`STRIPE_SECRET_KEY` / `DATABASE_URL` are missing. Make the DO **health check verify a real dependency**
(a cheap DB `SELECT 1` + AI-key presence) or stop returning static `healthy` — so a broken deploy fails
the gate.

**WS3 — P0-C refund/revocation integrity (code).** Make revocation **persist** (a refund/chargeback
must not be silently reverted by a later sync); the entitlement **read** must treat a revoked/cancelled
enrolment as no-access (close the lesson/quiz read path); **do not re-issue a certificate** for a
revoked enrolment (and consider marking the prior cert revoked). Use the existing webhook idempotency +
out-of-order guard as the state authority.

**WS4 — P0-D credential endpoint (code).** Require either an authenticated owner/admin session OR a
signed, **expiring, revocable** credential token (not a raw enrollment UUID); stop returning the
learner's full name to unauthenticated callers; add rate-limit.

**WS5 — P1 security (code).** `requireCron()` fail-closed (`if(!CRON_SECRET) 500` + `timingSafeEqual`)
across cron routes; the AI contact-reply auto-send must not trust a self-asserted judge verdict from the
same credential — require an independent check or human approval before auto-send; `enrollments/confirm`
must not skip the Stripe-email ownership check when the JWT email claim is absent (derive from Stripe);
fix the CORS `Access-Control-Allow-Origin` fallback to `localhost:3000`-with-credentials when
`NEXT_PUBLIC_FRONTEND_URL` is unset (fail closed / no credentials); add the secret-scan to CI (not just
the bypassable pre-commit hook).

**WS6 — P1 data-model + ops (Prisma migration, PRE_DEPLOY).** Change destructive cascades to
`Restrict`/soft-delete for the **team-owner** (don't destroy a team+subscription on owner delete) and
the **IICRC CEC compliance records** (regulatory-record retention — never cascade-erase); convert the
free-text status columns to enums + `CHECK`; add a **`DIRECT_URL`** to the datasource (RA-1807 guard) so
migrate can't be coupled to a pooler; add the missing FK indexes (`lms_enrollments.course_id`,
`lms_lesson_progress.lesson_id`, `lms_courses.instructor_id`, `lms_modules.course_id`,
`lms_lessons.module_id`); resolve `isPublished` tri-state; stop logging learner emails; add a
retention/erasure path for lead-CRM PII. Additive/forward-only per the repo's migrate discipline.

## 10 UX

Learner/instructor-facing behaviour is unchanged except: a guest whose email already exists is asked to
sign in (not silently taken over); a refunded learner loses access (correct); the public "verify a
credential" page either requires a share-token or shows less PII. Operator UX: a broken deploy now fails
the health gate instead of booting a silently-broken instance.

## 11 Technical design

- **WS1:** branch the existing-email case in `findOrCreateGuestUser` before any `update`; return a
  discriminated result the routes map to a 200 "sign in" (no session cookie). Turnstile verify + rate
  limit at the top of `guest-free`.
- **WS2:** a single `getAiKey()`/provider module reading `OPENROUTER_API_KEY` + base URL; a boot
  validator imported by `instrumentation.ts` (or equivalent) throwing in prod; `app/api/health` runs
  `prisma.$queryRaw\`select 1\`` + checks the AI key is set.
- **WS3:** a single `hasActiveEntitlement(userId, courseId)` used by every content/quiz/cert read that
  returns false for `revoked|cancelled|refunded`; the cert issuer checks it; the webhook writes the
  revocation as the authoritative state (idempotent).
- **WS4:** signed token (`jose`, short expiry, revocation list or `revokedAt` check) OR session gate.
- **WS6:** `onDelete: Restrict` + a `deletedAt` soft-delete for the protected relations; a data
  backfill is not needed (additive).

## 12 Security

- Close the unauth account-mutation primitive (WS1) — the single highest-severity finding.
- Fail-loud env + real health check (WS2) removes the Margot-class silent-break.
- Entitlement read is the one choke point for paywall integrity (WS3).
- Preserve the audited positives untouched (JWT fail-closed, Stripe integrity, IDOR discipline, quiz
  integrity, admin gating, CSP).
- IICRC CEC + team cascades are data-loss/regulatory risks, not exposure — but must-fix (WS6).

## 13 Verification plan

Sandbox: local + CI (no prod DB access here). Proof classes {proven-in-CI/local} /
{proven-after-deploy-gate}.
- **WS1:** unit/integration test — guest-free with an existing email returns 200 "sign in", does NOT
  change the password, sets NO session cookie; a brand-new email creates + signs in; guest-complete
  binds to the Stripe payer email; Turnstile/rate-limit rejection tested.
- **WS2:** the AI path calls the OpenRouter base URL (test); the boot validator throws in prod when the
  key is unset (test with `NODE_ENV=production`); `/api/health` returns non-200 when the DB `select 1`
  fails or the AI key is unset.
- **WS3:** entitlement/read tests — a revoked/cancelled/refunded enrolment yields no lesson/quiz access
  and no cert re-issue; a valid enrolment still works (non-regression); the webhook revocation persists
  across a later status sync.
- **WS4:** credential endpoint 401s (or requires a token) for an unauthenticated caller; no full name in
  the anonymous response.
- **WS5/WS6:** cron rejects blank secret; CORS doesn't emit localhost+credentials; migration applies
  additively (branch/CI) and the FK indexes/enums exist; `DIRECT_URL` present.
- **{gated}** DB-state + the live deploy-gate behaviour verify via the PRE_DEPLOY job + a preview/staging
  deploy — not from this box.

## 14 Loop & stress testing

Account-takeover regression: fuzz guest-free with existing/admin emails → never mutates/auths.
Entitlement matrix: {active, cancelled, refunded, revoked} × {lesson, quiz, cert} → only active grants.
Env-drift: boot with each required key missing → fail-loud; health gate red. Idempotency: replay the
Stripe refund event → single persisted revocation.

## 15 Acceptance criteria — 100/100 contract

1. **AC-1** guest-free/guest-complete never overwrite an existing account's password nor mint its
   session; existing email → neutral 200 "sign in" (no enumeration); brand-new only for create/auth.
2. **AC-2** guest-complete binds the session to the Stripe-verified payer email.
3. **AC-3** guest-free enforces Turnstile + per-IP rate-limit.
4. **AC-4** the AI path uses OpenRouter (code + `app.yaml` + monitor reconciled to one provider); no
   hardcoded `api.anthropic.com`.
5. **AC-5** a boot validator throws in production when AI key / `STRIPE_SECRET_KEY` / `DATABASE_URL` is
   missing (mirrors `jwt-secret.ts`).
6. **AC-6** `/api/health` verifies a real dependency (DB `select 1` + AI-key presence) and returns
   non-200 on failure.
7. **AC-7** a single server-side entitlement check treats revoked/cancelled/refunded as no-access and
   gates every lesson/quiz/cert read; revocation persists across sync.
8. **AC-8** no certificate is (re)issued for a revoked enrolment.
9. **AC-9** the credential endpoint requires auth or a signed expiring revocable token and does not
   return learner PII to anonymous callers.
10. **AC-10** cron routes fail closed on a blank secret (`timingSafeEqual`); CORS never emits
    `localhost:3000` + credentials on unset env; secret-scan runs in CI.
11. **AC-11** `enrollments/confirm` does not skip Stripe-email ownership when the JWT email claim is absent.
12. **AC-12** Prisma: team-owner + IICRC CEC relations use `Restrict`/soft-delete (no regulatory/team
    cascade-erase); status columns are enums + CHECK; `DIRECT_URL` present; the 5 FK indexes exist;
    `isPublished` tri-state resolved; learner emails no longer logged.
13. **AC-13** All audited positives stay green (JWT fail-closed, Stripe integrity, IDOR discipline, quiz
    integrity, CI gate); the DO region/data-residency + Vercel split-brain + dead-code items are
    documented as OUT (owner/hygiene), not built here.
14. **AC-14** Every change is CI-provable local; DB/deploy-gate items proven via the PRE_DEPLOY job /
    staging, not autonomous prod writes.

## 16 /goal command

```
/goal Implement docs/specs/spm-security-remediation-2026-07-12.md — WS1(kill guest-free/guest-complete account-takeover: no password overwrite / no session for existing emails, neutral sign-in, Stripe-email bind, Turnstile+rate-limit) + WS2(OpenRouter provider of record + fail-loud boot env validation + real /api/health) + WS3(persist revocation + single entitlement check gating lesson/quiz/cert, no cert re-issue on revoke) + WS4(auth/token the credential endpoint, drop PII) + WS5(requireCron fail-closed, AI reply independent gate, confirm email-claim, CORS fallback, CI secret-scan) + WS6(Prisma Restrict/soft-delete for team-owner+IICRC CEC, status enums+CHECK, DIRECT_URL, FK indexes, isPublished, PII-in-logs) to §15; verify per §13 in CI/local; DB/deploy items via the PRE_DEPLOY job/staging; DO region + Vercel-config + dead-code are OUT; keep the audited positives green.
```

## 17 Implementation sequence

1. **WS1 (P0-A)** — code-only, fastest, closes the exploitable takeover.
2. **WS2 + WS5 (env/provider/health + cron/CORS/CI)** — code+config, CI-provable.
3. **WS3 + WS4 (entitlement/revocation + credential)** — code, with the entitlement-read test matrix.
4. **WS6 (Prisma migration)** — additive; lands via the PRE_DEPLOY job.
5. **Owner/OUT** — DO region/data-residency decision; remove Vercel config + dead subtree.

## 18 Session-handoff seed

- **Repo.** `D:/CARSI` (`CleanExpo/CARSI`); audit `wf_f84795ad-cce`. Audit report → `docs/audits/`.
- **First commands.** Read this spec + `src/lib/server/guest-checkout.ts` + `app/api/lms/enrollments/
  guest-free/route.ts` (WS1) and the AI path + `app.yaml` (WS2).
- **Do not.** Introduce user-enumeration in the WS1 fix; add an AI key instead of reconciling the
  provider; regress the audited positives; write to prod (DB/deploy is gated).
- **Owner items.** DO region/data-residency (blr→AU); Vercel split-brain removal.

## 19 Final recommendation

**APPROVE BUILD — conditional.** §15 (AC-1 … AC-14) is the 100/100 contract, each traceable to an
audit finding. CARSI is well-built; the fixes are surgical. Honest ceiling: DB/deploy-gate items are
`{proven-after-deploy-gate}` (DO Postgres not queryable here); everything else is CI/local-provable.
Conditions: (1) an **adversarial-verify pass** before build (esp. the WS1 no-enumeration fix + the WS3
revocation state machine); (2) treat the IICRC CEC cascade as a must-fix regulatory-record risk; (3)
the DO region/data-residency question is an owner decision, not a code fix. The durable win: closing the
unauth account-takeover (WS1) + the Margot-class env/health gap (WS2) — the two highest-severity, most
recurrence-prone findings.

SPM spec complete. Next safe action: run the adversarial-verify pass, then build WS1 (account-takeover) first as the CI-provable, highest-severity fix.
