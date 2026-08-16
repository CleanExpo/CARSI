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
  Engine files landed in repo root (BACKLOG #1). Readiness was measured against the live site
  and a prod-like stack for the first time; the per-course purchase path, which is the only
  revenue that exists today, is GREEN end to end.
  **One defect fixed and shipped:** shared credential links sent viewers to a sign-in page
  (branch `fix/e2e-credentials-stale-redirect`, merged or awaiting merge — check `main`).
  **One defect found and NOT fixed:** the IICRC licence guard is blind to every skill and
  plugin surface. That is still true of `main` as you read this. A repair exists on
  `fix/iicrc-guard-skill-surfaces` but was de-scoped with open review findings — see
  BACKLOG Discoveries, where it is the highest-value item.
  A full readiness scorecard was written to `docs/RELEASE-READINESS.md` on branch
  `docs/release-readiness-20260817`; it is **not** on `main` yet, so do not expect to find it
  here until that branch merges.
