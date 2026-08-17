# GOAL.md — the objective function (read this before any work)

**End state:** CARSI is the operating infrastructure of the Australian cleaning & restoration
industry — credentials (CARSI designations + IICRC CEC provider status), registry (NRPG
directory), daily tooling (RestoreAssist), community (CCW events), and the citable industry
dataset (AU Benchmark). The ISSA shape, operated by one founder + agents.
Full strategy: `2nd Brain/Plans/carsi-ecosystem-blueprint-2026-08-16.md` + revenue playbook.

**The metric:** RWR — recurring weekly revenue = (memberships × $795 + seats × seat price) ÷ 52,
plus 4-week rolling course sales. Every session reports RWR movement or names the blocker.

**Gate ladder (work only at the current gate):**

| Gate | Trigger | Focus |
|---|---|---|
| **0 — ignition (CURRENT)** | now | CEC submissions sent · subscriptions ON · outreach sent · benchmark instrument approved |
| 1 — records wedge | ~$500/wk RWR | Proof-pack · NRPG directory live · renewal funnel |
| 2 — firm stack | ~$1,000/wk RWR | Teams tier · CARSI+RestoreAssist+NRPG bundle · benchmark fielded · franchise deals |
| 3 — authority flip | ~$2,000/wk RWR | Benchmark report published · membership tier · insurer/strata demand side |
| 4 — quiet flip | organic | Directory becomes how the industry finds firms |

**Standing rules:**
1. All work comes from `BACKLOG.md` top-down. No work that isn't on it; discoveries go on the
   bottom, not into the current session.
2. Blocked-on-founder goes to `DECISIONS.md` with a default and a deadline — then keep moving
   on the next unblocked item. Never stall silently.
3. Licence guards are release blockers, never advisory. IICRC is the referee, not a rival.
4. No new process machinery (gates, loops, formats, orchestrators). Building the machine is
   done; this file exists so sessions build the BUSINESS.
5. One session owns this repo at a time.
6. Session end = update BACKLOG/DECISIONS state + one line: the customer-visible delta.

**Current state (update each session):**
- 2026-08-16: Gate 0. RWR ≈ $0 (subscriptions off, CEC registry empty). Site live, 80 courses.
  Engine files created; awaiting landing in repo root.
- 2026-08-17: Gate 0. RWR ≈ $0 — unchanged, and the blocker is unchanged: subscriptions are
  dark and the CEC approvals registry is empty, both founder-gated (DECISIONS #1, #2).
  Engine files are on `main` as of 2026-08-16, merged as `41712c69` (PR #666) — BACKLOG #1 done.
  Readiness was measured against the live site and a prod-like stack for the first time.
  **Correction to the first draft of this entry:** it recorded the per-course purchase path as
  "GREEN end to end". That was FALSE and is struck. The per-course endpoint
  `app/api/lms/checkout/route.ts` exists, but no e2e spec exercises it: `grep -rn "lms/checkout"
  e2e/` matches nothing across all five specs, and the only checkout call under test is
  `api/lms/subscription/checkout` (`e2e/revenue-path.spec.ts:140`) — the dark subscription flow.
  So the only revenue path that exists today is **UNKNOWN**, not green, and covering
  `app/api/lms/checkout` is the top red in revenue order.
  **One defect fixed, merged and verified live:** shared credential links sent viewers to a
  sign-in page. Merged as `c05b4676` (PR #665) on 2026-08-16 and observed on production the same
  day — `/credentials/<id>` now forwards to the public `/verify/credential/<id>`, which returns
  200 with no password field.
  **One defect found and NOT fixed:** the IICRC licence guard is blind to every skill and
  plugin surface. That is still true of `main` as you read this. A repair exists on
  `fix/iicrc-guard-skill-surfaces` but was de-scoped with open review findings — see
  BACKLOG Discoveries, where it is the highest-value item.
  A full readiness scorecard was written to `docs/RELEASE-READINESS.md` on branch
  `docs/release-readiness-20260817`; it is **not** on `main` yet, so do not expect to find it
  here until that branch merges.
- 2026-08-18: Gate 0. **RWR ≈ $0 — unchanged, and the blocker is unchanged.** Both remaining
  Gate 0 revenue switches are founder-only: the CEC packs need sending (DECISIONS #1, due
  2026-08-20) and the subscription flip needs approving (DECISIONS #2, due 2026-08-23). No agent
  action moves RWR until one of those happens. What moved was everything standing behind them.
  Eight commits on `worktree-overnight-gate0-20260818`, **unpushed** — Codex, the independent
  reviewer the release gate requires, is out of credits until 2026-08-20, and the gate forbids
  self-certifying, so the branch is queued rather than released. The commits live in the shared
  `.git`, so removing the worktree does not lose them.
  - **The IICRC terminology guard could not fail on this machine.** `isCli` compared
    `import.meta.url` against `file://` + the raw path; the space in `/Volumes/Storage Unit/`
    percent-encodes, so the comparison was always false, the reporting block never ran and it
    exited 0 whatever the scan found. Proven both directions with one canary. CI paths have no
    space, so CI was unaffected and `main`'s green history is real — the damage was to every
    manual run used to self-certify a change. Three scripts shared the idiom; a fourth crashed
    on the same root cause. **Any "guards green" claim made locally before today is worthless.**
  - Armed, the guard then found real violations live on production: `llms.txt` carried a
    seven-acronym IICRC discipline roster, an acronym-headed "IICRC Disciplines Explained"
    section and a blanket CEC claim against an empty approvals registry, plus seven CTAs naming
    CARSI products by acronym. All fixed; three new rules added, each measured against the full
    scope before being written.
  - The guards were also blind to `.claude/skills/`, `skills/` and `.claude-plugin/` — 25 tracked
    files, including the skill that tells an agent how to write a course — and lost any file
    whose name needed percent-encoding, because `git ls-files` quotes those paths. Both closed,
    both proven before/after.
  - **BACKLOG #2 delivered:** ten CEC packs and a cover email, 11 CECs, in `docs/cec-submissions/`.
  - **BACKLOG #4 unblocked:** the go-live pre-flight can now tell a refusal from a broken gateway.
  - **The only live revenue path now has tests.** `app/api/lms/checkout` had none; it has 10 e2e
    cases, proven non-vacuous by running them against the wrong server.
  - **Customer flow:** `/courses` was shipping 46.2 MiB of raw Cloudinary PNGs into cards a few
    hundred pixels wide — measured 48,486,199 → 255,619 bytes, 99.48% smaller, ~242 s → ~1.2 s of
    image transfer on a slow connection. `/refund-policy` and `/support` existed only as 404s and
    now exist, are footer-linked and pass accessibility checks.
  - **Security:** six checkout and billing-portal routes accepted any attacker-supplied Stripe
    return URL. Now restricted to an origin allowlist.
  - Founder queue grew by four: DECISIONS #15 (four live course URLs branded with IICRC
    discipline acronyms), #16 ("CEC-accredited" live on ~19 surfaces against an empty registry),
    #17 (`/terms` §5 asserts IICRC-approved courses and CEC reporting), #18 (the `/courses`
    "IICRC Discipline Map" feature). #7's AAA half was measured for the first time and FAILS.
  - **An independent reviewer was run and returned FAIL, which was worth every minute.** It found
    that `/courses` — the flagship page — still published the seven-acronym IICRC discipline
    roster plus a blanket CEC claim, live, and that the three rules written earlier in the session
    provably could not see it: the sentence is assembled from JSX children, so the literal `(WRT)`
    never appears on a source line. Copy fixed; the underlying lesson is that **these guards scan
    source, and components emit copy at render** — logged as a design question, not patched with
    more regex. The reviewer's own session denied code execution, so mutation-control,
    guard-falsification and clean-environment-suite are undone rather than N/A, and it correctly
    refused to quote this session's runs as its evidence. Report kept at
    `docs/reviews/reviewer-report-5f1f8914.json`.
  - **The release gate is NOT satisfied and nothing was self-certified.** Codex — the
    model-diverse reviewer the gate prefers — is out of credits until 2026-08-20; the fallback
    reviewer could not execute; three checklist items are undischarged. Per the gate, the work is
    queued rather than released. The branch is committed and lives in the shared `.git`, so it
    survives worktree removal, but it exists only on this machine's external drive until someone
    pushes it.
