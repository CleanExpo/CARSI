# CARSI Delivery Pipeline — Phase-Gate Process

> The repeatable process for taking the audit register (see the
> 2026-06-29 parallel-specialist audit) from finding → fix → 100% green →
> PR → merge to `main` (production). Swarm-driven, evidence-gated.
> Anchored to `CARSI_VERIFICATION_GATE.md` and `COMPOUND_ENGINEERING_LOOP.md`.

## Ground truth (verified 2026-06-29)

- **`main` = production.** `app.yaml` has `deploy_on_push: true` on `main`, served
  via DigitalOcean App Platform behind Cloudflare (carsi.com.au). **Every merge to
  `main` auto-deploys to the live commercial site.**
- **`origin/sandbox` is ~477 commits ahead of `main`** — a divergent accumulation.
  Prod fixes do NOT route through sandbox (would drag 477 unaudited commits into prod).
- **Branch protection on `main` currently requires NO status checks** (single
  self-approving account). Therefore **green is enforced locally by this process**,
  not by GitHub. Phase 4 hardens this.

## The per-phase loop

Each phase is one coherent, independently-shippable batch from the register.

1. **Branch** off the latest `origin/main`:
   `git fetch origin && git switch -c fix/<phase-slug> origin/main`
   (Commit early — the `hermes-agent` autogit job can yank uncommitted work.)
2. **Fix** the batch. Swarm fans out one agent per finding when findings are
   independent; serial when they touch the same files.
3. **Gate — 100% green, run locally, no exceptions:**
   ```
   npm run type-check        # mandatory every phase
   npm run lint              # when source changed
   npm run test:unit         # when logic/lib changed
   npm run test:e2e          # when user-facing flows changed
   npm run test:a11y         # when UI/markup changed
   npm run build             # standalone build must succeed
   ```
   Plus any finding-specific proof (curl the live route after deploy, a focused
   script, a screenshot). A subagent's "green" is UNCONFIRMED until re-run here.
4. **Commit** with the finding IDs, push the branch, **open a PR** to `main`.
5. **Merge** per the authorized merge mode (auto-merge green / await founder click).
6. **Post-merge verify**: after the DO deploy settles, re-run the finding's live
   proof against carsi.com.au. Only then is the phase **Done**.
7. **Next phase** branches off the new `origin/main` (so phases stack cleanly).

## Hard rules

- No `db:seed-*` / `ccw:scrape` against production without explicit founder approval.
- No secrets committed; secret-rotation phases require founder action in the vendor
  dashboard before history scrub.
- Prod DB migrations (Phase 5) are founder-gated — they hit the real prod database.
- Compliance copy (Phase 10) requires founder wording sign-off — legal exposure.
- Every claim of "fixed" carries first-source proof, per the evidence rule.

## Phase order (2026-06-29 register → ordered by safety × value)

| # | Phase | Risk | Findings | Gate |
|---|-------|------|----------|------|
| 1 | SEO + structured data | none (metadata) | canonical→home, logo 404, dup title, courseWorkload/image | type-check, lint, build, live curl |
| 2 | Safe config hardening | low | GA/GTM CSP allowlist, poweredByHeader, X-XSS, forgot-pw rate-limit, .env.example | type-check, lint, build |
| 3 | Demo/dev page leak | low | noindex/remove /demo,/demo-live,/council-demo,/status-demo | build, live curl robots/meta |
| 4 | Type-gate + CI integrity | low | drop tsconfig excludes, wire test:unit, delete dead workflows, set required checks | type-check, full CI |
| 5 | Data integrity (migration) | **founder-gated** | lms_lesson_progress.student_id FK | migrate on prod w/ approval |
| 6 | LMS assessment integrity | medium | quiz-gates-completion, server-side lesson gating, quiz Continue gate, score round, attempt race | unit + e2e |
| 7 | Stripe revocation | medium | refund/dispute/chargeback handlers, idempotency reclaim | test:stripe-webhook + unit |
| 8 | Auth session lifecycle | medium | per-request isActive/role, stop hardcoding is_active | unit + e2e |
| 9 | CSP nonce migration | **high** | nonce script-src, drop unsafe-inline | full e2e + real browser |
| 10 | Compliance copy | ✅ done (founder chose Option B) | IICRC CEC accredited→IICRC-aligned CEC, IICRC-certified training→IICRC-aligned training, dropped IAG/Suncorp/QBE names, qualified "only holder" superlative; person/IICRC-cert-code refs preserved | type-check, lint, test:unit, build |
| 11 | Secret rotation + history scrub | **founder-gated** | rotate whsec_, scrub git history | founder rotates first |
| 12 | Frontend contrast / a11y | low | 7 homepage contrast violations + re-run failed frontend dimension | test:a11y + axe |
| 13 | Bloat cleanup | none | react-hot-toast, concurrently, output/pdf, dup course file | build |

Phases 1–4, 6–9, 12–13 are agent-autonomous. Phases 5, 10, 11 stop for founder input.
