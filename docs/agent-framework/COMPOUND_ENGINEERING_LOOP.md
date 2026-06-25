# Compound Engineering — CARSI Autonomous Kanban Controller

> CARSI adaptation of the Compound Engineering "continuous ship loop"
> (originally specified for RestoreAssist in Linear `RA-6774`). This document
> is the operating contract for any autonomous or semi-autonomous agent that
> ships CARSI work through a Linear-style Kanban.

## Goal

Run CARSI through a continuous Compound Engineering loop using Linear as the
operating Kanban: **plan** the next outcome, **ship** the smallest valuable
slice, **review** against CARSI repo rules, then **compound** the learning into
future agent work.

This controller does not invent new architecture. It plugs into CARSI's
existing agent framework:

- `SENIOR_PM_AGENT.md` — produces gated plans.
- `SENIOR_ORCHESTRATOR_AGENT.md` — executes plans, delegates, collects evidence.
- `SENIOR_SPECIALIST_AGENTS.md` / `SUB_AGENT_PROTOCOL.md` — do the narrow work.
- `RECOMMENDED_SKILL_MAP.md` — picks skills per task type.

The loop below is what wraps those agents into a repeatable ship cadence.

## Verified local baseline (update each pass)

- **Repo:** `CleanExpo/CARSI` (canonical local path per `CLAUDE.md`).
- **Stack:** Next.js 16, TypeScript 5.7, Prisma 7.6, PostgreSQL, Stripe.
- **Package manager:** **npm** (`npm@10.9.0`, Node `22.x`). Do **not** use
  `pnpm`/`yarn` — `package-lock.json` is the lockfile of record.
- **Bootstrap read before any pass:**
  - `CLAUDE.md` / `AGENTS.md` (identity + SSOT)
  - `docs/agent-framework/*` (this framework)
  - `docs/agent-framework/CARSI_VERIFICATION_GATE.md` (review rules)
  - `.cursor/rules/*.mdc` (scoped repo rules, e.g. App Platform deploy)
- **Record the current git head and the last green check on each pass** so the
  next agent inherits a trustworthy baseline.

## Compound Engineering operating loop

### 1. Plan

- Read the issue. Inspect existing code **first** — CARSI already has 85 API
  routes, a Prisma schema, an admin session layer, and Stripe checkout. Reuse
  before adding.
- Define the **smallest independently shippable outcome**.
- Identify the **verification** that proves the outcome *before* editing.
- Hand off to / act as the PM Agent to produce a gated plan.

### 2. Work

- Implement surgically on the assigned feature branch or a worktree.
- **One active code-modifying agent per shared worktree** unless isolation is
  explicit (separate worktree). Read-only sub-agents may run in parallel.
- Match surrounding code: comment density, naming, idiom. No drive-by rewrites.

### 3. Review

Run the task-specific checks **plus** the always-on gate:

```bash
npm run type-check      # tsc --noEmit — ALWAYS
npm run lint            # eslint . — when source changed
npm run test:unit       # vitest run — when logic/lib changed
npm run test:e2e        # playwright — when user-facing flows changed
npm run test:a11y       # playwright a11y — when UI/markup changed
```

Then apply the **CARSI Verification Gate** (see
`CARSI_VERIFICATION_GATE.md`): auth on protected APIs, bounded Prisma
`findMany`, parameterized SQL (no string interpolation in raw queries), no
leaked `error.message` in 5xx bodies, real content-sniffing on uploads, and
subscription/credit/Stripe gating for AI and paid actions.

Scope the heavier suites (e2e/a11y) to touched risk — do not run the whole
matrix for a one-line copy change, but never skip `type-check`.

### 4. Compound

- Update the Linear issue with **evidence** (command output, diffs, screenshots),
  blockers, and any follow-up issues.
- If the agent learned a **durable repo rule**, propose an update to
  `AGENTS.md`, `docs/agent-framework/*`, or a `.cursor/rules/*.mdc` file —
  do not rely on memory. Compounding means the next agent starts ahead.

### 5. Kanban movement

CARSI has **no dedicated Linear team** today (workspace teams are RestoreAssist,
Synthex, Unite-Group, G-Pilot, DR-NRPG). Until a CARSI team exists, track CARSI
autonomous work using the established **Pi-Dev** workflow on the governing team,
or whatever team the card lives on. The state machine is:

```
Ready for Pi-Dev → Pi-Dev: In Progress → In Review → Done
```

Use **`Pi-Dev: Blocked`** with a specific blocked-reason label when credentials,
owner action, ambiguous scope, or an external dependency stops progress.

> Action item for the human owner: if CARSI work should be tracked separately,
> create a CARSI Linear team (or project) and update this section with its
> real state IDs. Recorded here so it compounds instead of being re-discovered.

## Queue selection for autonomous passes

There is no fixed CARSI queue baked into this doc (unlike RA-6774, whose queue
was RestoreAssist-specific). Pick the next card by this priority order:

1. **Safety / correctness** regressions on shipped surfaces (auth, payments,
   data exposure) — highest priority.
2. **CI / verification health** — keep `type-check`, lint, and tests green and
   ratcheting (e.g. reduce ungated lint warnings over time).
3. **Adoption blockers** for learners/admins on already-shipped features.
4. **New slices** of in-flight features, smallest shippable first.

When two cards tie, prefer the one whose verification is cheapest to prove.

## Stop conditions

- **Do not mark Done without evidence** in the issue.
- **Do not start owner-gated tasks** that require dashboard credentials
  (DigitalOcean, Stripe, Cloudinary, database), App-Store-style access, or
  production secrets, unless the issue states the credential is available.
  Move to `Pi-Dev: Blocked` instead.
- **Do not claim production readiness** without the owner's acceptance where a
  release gate calls for it.
- **Do not touch other portfolio repos.** This controller is scoped to
  `CleanExpo/CARSI`. RestoreAssist, Synthex, etc. are separate repos — even
  though CARSI references RestoreAssist as a sibling brand
  (`src/lib/brand-video-assistant.ts`), their code lives elsewhere.
- **Do not create duplicate audit/scout cards** — search Linear by a normalized
  source key before creating.

## Provenance

Adapted from Linear `RA-6774` ("[Compound Engineering] RestoreAssist autonomous
Kanban controller — continuous ship loop"). The loop philosophy is reused
verbatim; the baseline, commands, repo rules, and team topology are rewritten
for CARSI's actual stack and constraints.
