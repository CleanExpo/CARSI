# Overnight Run — Execution Spec (2026-07-17)

**Status:** ready to run. **Authority:** founder-directed, bounded below.
**Predecessor state:** `docs/session-handoffs/handoff-20260717-234500.md` — read it first.

---

## 1. Engines — all three proven live this session

| Engine | Version | Proof obtained |
|---|---|---|
| Claude (Mac) | Opus 4.8 | orchestrator |
| Codex (Mac) | `codex-cli 0.144.5` | returned `CODEX-MAC-READY` |
| Codex (PC, via `ssh win-ts`) | `codex-cli 0.134.0` | returned `CODEX-PC-READY` |

**Transport:** outbound Mac→PC only. `ssh win-ts 'codex exec --skip-git-repo-check "<prompt>"'`.
Do **not** attempt inbound SSH to the Mac: it needs an access grant that was never made, and
`claude` + `/login` is interactive and cannot complete unattended.

## 2. Hard boundaries

- **No deployments.** **No merges.** **No PR creation** (opening a PR authorises its merge here).
- **No destructive changes:** no deletes, no issue closure, no prod-DB writes, no cron deletion.
- **No force-push.** **Never push to `main`.**
- Local non-destructive edits on a branch, committed, pushed. Everything else is a **proposal**.
- **Do not invent work.** If the queue empties, stop and write the handoff. Do not self-assign.

## 3. Work queue — bounded, in order

| # | Task | Definition of done | Gate |
|---|---|---|---|
| 1 | Instructor edit page: file the ticket for missing `PATCH /api/lms/courses/[slug]` + `[slug]/modules` handlers | Ticket drafted with evidence (file:line + `ls` proof) | **Founder files it** — agent drafts only |
| 2 | Correct GP-518's description (timeout hypothesis disproven) | Draft comment with evidence | **Founder posts** — agent drafts only |
| 3 | Test-coverage sweep: which suites exist and are never run | List + `vitest run` output per suite | Report only |
| 4 | `Done ≠ Live` audit: GP-513's stranded-asset blast radius beyond H5 | Per-course live check vs Done status | Report only |

**Nothing beyond this table.** Items 3–4 are read-only investigations.

## 4. Adversarial protocol (Session 20, applied)

- **Creator and challenger are different model families.** A finding produced by Claude is
  challenged by Codex, and vice versa. **No engine verifies its own output. Ever.**
- **Agreement is not evidence.** Consensus between two models is correlated error. Promotion
  requires a retrieved source or a tool result **from this run**.
- **Challenger attempts refutation, not review.** Default `refuted=true` under uncertainty.
- **Preserve dissent.** Unresolved disagreement is a first-class output, not a failure. Never
  silently reconcile.
- **Proposal-only** unless authority already exists in §3.

**Grounding:** the H5 handoff (2026-07-17 §4) records six claims asserted as true; **zero** caught
by self-review, **all six** caught against the live system — including a self-audit that returned
PASS on a fabricated claim. This session repeated the pattern twice more ("the frontend doesn't
need this route"; "no precedent for route tests") — both false, both caught only by checking.

## 5. Evidence + confidence contract

Every finding:

```json
{"claim": "...", "evidence": ["tool result / file:line / API response FROM THIS RUN"],
 "confidence": 0.0, "challenger": "codex|claude", "attack_survived": true,
 "verified_against_live_system": true, "human_decision_required": true}
```

| Score | Meaning |
|---|---|
| 0.9–1.0 | Verified against the live system this run, survived challenge |
| 0.6–0.8 | Retrieved source this run, survived challenge, live state unchecked |
| 0.3–0.5 | Reasoned from artifacts, no live check |
| 0.0–0.2 | Assertion or memory only — **flag, never act** |

**Positive control is mandatory.** A null result is not evidence until the check is proven able to
return non-null. `0 findings` from a broken query is identical to `0 findings` from a clean system.
Applies to greps, test runs (a suite collecting 0 tests exiting 0 is a **failure**, not a pass),
and status checks.

## 6. Context management — the 45% rule (MANDATORY)

**Trigger: when context remaining drops to 45%, stop taking new work immediately.**

Do not start the next queue item. Do not "just finish this one thing". At 45%:

1. **Finish or abandon** the in-flight step cleanly — commit if the tree is dirty, or revert it.
   Never leave a half-edit.
2. **Write the handoff** to `docs/session-handoffs/handoff-<YYYYMMDD-HHMMSS>.md` using the
   `/session-handoff` structure. It must record: branch, commits, what is verified vs hypothesis,
   deferred items with owners, and an explicit "Do not redo" list.
3. **Commit and push** the handoff on the working branch.
4. **Resume** in a fresh session via `/resume-from-handoff`, pointed at that file.
5. The resumed session **re-reads this spec** and continues at the next unstarted queue item.

**Why 45% and not lower:** the handoff itself costs context. Writing it at 10% produces a thin,
useless handoff — precisely when a good one matters most. 45% leaves room to write it properly and
to verify what it claims.

**The resumed session must not re-verify what the handoff proved.** Honour the "Do not redo" list;
re-deriving settled facts is how a night gets burned.

## 7. Morning package — ONE file

`docs/session-handoffs/overnight-package-<date>.md`. Not a pile of partials.

1. **DONE** — completed work, each line carrying the tool result that proves it.
2. **PROPOSED** — findings with evidence + confidence + the challenger's attack and whether it landed.
3. **UNRESOLVED DISAGREEMENTS** — kept, not reconciled. Both positions stated.
4. **NEEDS PHILL** — ranked by cost of delay. Each states the decision needed and what unblocks.

## 8. Deferred tonight — explicitly, not abandoned

- **Sessions 17–19, Session 21** — deferred: cognitive budget, decision dependency, unverified
  infrastructure. Not abandoned. Session 21's ops/governance programme requires a Linear/cron
  audit surface that has not been scoped.
- **PC hook fix** — blocked: classifier refuses remote config writes. Command is in the handoff §8.
- **PC `PermissionRequest` auto-allow** — unresolved safety question. The PC's Codex auto-approves
  every permission request. **Do not rely on that box for anything irreversible tonight.**

## 9. Anti-patterns — automatic reject

- Status field accepted as truth. "Done"/"merged"/"shipped" are claims. Check the live system.
- "Both engines agree, therefore true."
- Vacuous green reported as a pass.
- Building speculative scheduler infrastructure. Use the authenticated CLIs directly.
- Silent scope growth. If it is not in §3, it is not tonight's work.
- Ending a turn on a promise of work not yet started.
