# SESSION 21 — Operations & Governance Programme

**Orchestrator:** senior project manager (Claude, this Mac).
**Workers:** Claude-Mac + Codex-PC (`ssh win-ts` → `codex exec`), adversarial pairing maintained.
**Runs alongside** the overnight package and Session 20. Does not replace either.

---

## Hard boundaries — non-negotiable

- **No deployments.** None. Not preview, not prod, not "just a redeploy".
- **No destructive changes.** No deletes, no closes, no merges, no branch removal, no
  prod-DB writes, no cron deletion, no Linear issue closure.
- **Safe maintenance only:** local non-destructive edits, on a branch, committed.
- Everything else is a **proposal with evidence**, never an action.

Rationale, from this estate's own record: `merge-gate` doctrine states opening a PR
authorises its merge, and `auto-merge-while-red-poisons-main` records auto-merge landing
RED PRs onto main. Overnight, unattended, the blast radius of a wrong action exceeds the
value of any action. Discovery is safe; execution is not.

## Scope — five review surfaces

| # | Surface | Hunting for | Evidence required |
|---|---|---|---|
| 1 | **Linear** (team G-Pilot + others) | stale issues, duplicates, issues whose premise is already resolved | issue ID + last-activity date + live-state check |
| 2 | **Cron jobs** (`hermes cron`, LaunchAgents, Vercel crons) | dead, redundant, silently-failing, or inert-by-missing-secret | last-run result, not schedule presence |
| 3 | **CRM Kanban** (`kanban.db`) | cards diverged from reality; "Done" that never shipped | card state vs live system |
| 4 | **Test coverage** | suites that exist and are not run; suites that pass vacuously | actual run output, exit code |
| 5 | **Cross-project reuse** | the same thing built N times across the portfolio | file paths in ≥2 repos |

## The "Done ≠ Live" mandate — surface 1 and 3 especially

The highest-value class of finding in this estate is **work marked complete that never
reached production**. Cited precedent (H5 handoff, 2026-07-17, §5): Linear **GP-513** —
assets built and marked Done (GP-482/485/486/487/488) never reached learners, "~45 KB
stranded per course, blast radius unknown — only H5 checked." And **GP-512** — merged
changes to `courses-catalog.json` are silently inert.

Therefore: **never accept a status field as truth.** A Linear issue marked Done, a Kanban
card in the Done column, and a merged PR are all *claims*. Resolve each against the live
system. An issue's status is evidence of what someone believed, not of what is.

## Test runs — positive control mandatory

Run suites **where they exist**. Do not create them.

Before reporting "N tests passed" or "0 failures", prove the runner works:
- Confirm the command actually executed a suite (non-zero test count).
- A suite that collects 0 tests and exits 0 is a **failure to run**, reported as such —
  never as a pass.
- RestoreAssist uses **vitest, not jest** (per estate record). Check the runner before
  claiming a red result is a real red.

`0 findings` from an unproven query is indistinguishable from `0 findings` from a broken
one. Run the positive control first.

## Allocation model

The PM allocates by surface, then pairs adversarially. **No engine reviews its own output.**

```
PM → assigns surface to WORKER-A
WORKER-A → produces findings + evidence
PM → routes findings to WORKER-B (the other engine, always)
WORKER-B → attempts refutation, cites what it checked
PM → records both positions; unresolved disagreement survives to the ledger
```

Alternate assignment each cycle so neither engine owns a surface. Claude-Mac and Codex-PC
swap; a finding produced by Codex is never verified by Codex.

## Morning executive package — single document

Path: `docs/session-21/exec-package-<date>.md`. **One file.** Not a pile of partials.

Three sections, in this order:

### 1. DONE — safe maintenance actually completed
Each line carries the tool result that proves it. No entry without evidence from this run.

### 2. PROPOSED — findings with evidence + confidence
| field | meaning |
|---|---|
| finding | one sentence |
| surface | Linear / cron / kanban / tests / reuse |
| evidence | tool result, file:line, API response **from this run** |
| confidence | evidence-tiered (see Session 20 scale) |
| refuted_by | the other engine's attack, and whether it landed |
| proposed action | what a human would do — not what was done |

### 3. NEEDS YOUR CALL — escalations, ranked
Anything founder-gated, contradictory, or irreversible. Ranked by cost of delay.
Each entry states **what decision is needed** and **what unblocks on each answer**.

## Escalate, never resolve

- Founder-gated by standing record: prod-DB writes, CodeRabbit thread resolution,
  IICRC/CEC approval, spend >$1k, issue closure, PR merge.
- Two locked decisions in conflict → record, do not reconcile.
- Any proposal whose evidence is founder-only knowledge.

## Anti-patterns — automatic reject

- Status field accepted as truth → check the live system.
- "Both engines agree" → correlated error, not verification.
- Vacuous green (0 tests collected, exit 0) reported as pass.
- Silent scope growth into building. This programme reviews; it does not ship.
- A pile of partial work. If it is not in the single exec package, it did not happen.
