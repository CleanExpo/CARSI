# Session Handoff — the positive control found a real P1 the four previous rounds missed

**Timestamp:** 2026-08-20 15:20 AEST
**Machine:** `Phills-Mac-mini.local`
**Repo:** CARSI — worktree `/Volumes/Storage Unit/CARSI/.claude/worktrees/fix-674-review-findings`
**Branch:** `feat/ci-live-catalogue-guard` @ `2cc95296` — tree clean, stash empty,
**7 commits unpushed** (remote is at `3ab22784`)
**Scope:** resumed `handoff-20260820-125154` to land the stranded `push:`-trigger fix

---

## 1. Summary

**State: WIP-BLOCKED.**

The previous session's blocker (CI-P1-001 stranding the push) is **no longer what blocks this**.
The gates pass. What blocks it now is better: a **real P1 was found in the shipping code**, fixed,
and its re-review has not yet returned a verdict.

**Definition-of-Done:** 1 **partial** (the P1 is fixed; its confirming review is incomplete) ·
2 **yes** (all seven gates exit 0, §6) · 3 **yes** (tree clean, stash empty) · 4 **partial**
(PR #682 exists; 7 commits unpushed) · 5 **yes** (the fix was demonstrated failing under a mutant
and the workflow shell was exercised across seven inputs). Any partial forbids SHIPPED.

**The finding that matters more than the feature:** `renderSummary(report_with_violations, '0')`
printed `✅ 80 live courses checked, all clean.` and never named the violation — while the fail
step exited 0 on that same code. A guard that contradicted itself would have rendered green **and
passed**. That is the exact equivalence this whole family of guards exists to prevent, and it
survived four previous review rounds, the original author, and my own reading of the file.

**How it was caught is the transferable part.** It was not found by reviewing harder. It was found
because I ran a **positive control** — a second, identical review against a head carrying a
deliberately planted defect, dispatched to prove the reviewer could return FAIL before I was
entitled to quote a PASS. The control caught its planted target *and* surfaced this real one as a
side effect. The real review then found the same defect independently, same file, same line.

---

## 2. Where it started

`/resume-from-handoff` against `handoff-20260820-125154-live-catalogue-guard-in-ci.md`. That
handoff was **WIP-BLOCKED**: BACKLOG #30 built and observed working, but PR #682's pushed head
carried a `push:`-trigger defect whose fix (`e3a3b49e`) could not be pushed because the release
gate's `npm run test:unit` failed non-deterministically (CI-P1-001).

Phase 2 reconciliation returned **MATCH** — every claim in that handoff verified, no drift.

---

## 3. Decisions locked + what shipped

**Nothing shipped yet. All work is local — 7 commits on this worktree only.** The remote is still
at `3ab22784`; PR #682's head is unchanged and still carries the `push:`-trigger defect.

**Decisions locked this session:**

- **The receipt target is re-derived from HEAD, never read from handoff prose.** The previous
  handoff said "retry the receipt for `3c9cddbb`", but writing that handoff moved HEAD past it.
  `pr_release_gate.py:498` fails closed on `head_sha` mismatch, so the preserved review of
  `e3a3b49e` could not receipt anything. There is no docs-only exemption. Saved to memory as
  `handoff-receipt-target-goes-stale`.
- **A reviewer's PASS is not quotable until that reviewer has been watched failing.** Implemented
  as a twin dispatch: same brief, same model, one head carrying a planted defect. This is what
  found the P1.
- **The contradiction fix is two halves, not one.** Fixing only the summary prose would have left
  the *job* green on a self-contradicting audit. The fail step now believes exit 0 only when
  `audit.json` agrees with it.
- **CI-P1-001 stays open.** Two more hypotheses were measured out, and it did not reproduce in
  four attempts — but a negative reproduction is not a fix, and it is recorded as a correlation
  rather than a mechanism.

---

## 4. Key files

| File | Status |
|---|---|
| `scripts/live-catalogue-ci-summary.mjs` | Modified — contradiction branch: exit 0 with a non-empty `violations` list renders as a guard defect, and still lists what was reported |
| `scripts/live-catalogue-ci-summary.test.mjs` | Modified — 2 regression checks; the suite is now 169 checks (156 guard + 13 summary) |
| `.github/workflows/live-catalogue-guard.yml` | Modified — the fail step believes exit 0 only when `audit.json` agrees; missing / unparseable / violation-bearing reports fail closed |
| `BACKLOG.md` | Modified — CI-P1-001 updated with two eliminations; the cursor-agent misdispatch filed as a new discovery |
| `docs/session-handoffs/handoff-20260820-152000-*.md` | Created — this file |
| `~/.claude/jobs/f37f7054/tmp/mirror-gate-tests.py` | Created (outside repo) — faithful mirror of `pr_release_gate.run_tests`, so diagnosing the gate never spends the gate's own run |

---

## 5. Running state

- **One background process IS running at the time of writing:** a `cursor-agent` drain-verification
  review of `2cc95296` in `~/.claude/jobs/f37f7054/tmp/review-8f5f8ba2`. Verified via
  `pgrep -f "workspace .../review-8f5f8ba2"` → 1. Its `reviewer-report.json` currently holds only
  the fail-closed skeleton (all eight items `N/A`, "created before file review"). **That is not a
  verdict.**
- Two disposable review worktrees exist and are registered in `git worktree list`:
  `review-8f5f8ba2` (at `2cc95296`) and `review-control` (at `fd049935`, carrying a planted
  defect that must never be merged).
- Gate logs: `~/.claude/jobs/f37f7054/tmp/` — `r-typecheck.log`, `r-live-cat.log`, `fix-test.log`,
  `mutant-test.log`, `fix-eslint.log`, `h2-live.log`, `mirror-gate.log`.

---

## 6. Verification — exact commands

All run this session in this worktree. The seven gates were run on `2cc95296` through
`mirror-gate-tests.py`, which reproduces `pr_release_gate.run_tests` exactly (same
`subprocess.run(shell=True)`, same `cwd`, same env stripped of `GIT_REDIRECT_VARS`):

```bash
npm run type-check              # 0   51.7s
npm run test:unit               # 0   66.7s
npm run test:live-catalogue     # 0    5.0s   169 checks
npm run check:iicrc-terminology # 0
npm run check:iicrc-compliance  # 0
npm run check:cec               # 0
npm run check:designations      # 0
npx eslint scripts/live-catalogue-ci-summary.mjs scripts/live-catalogue-ci-summary.test.mjs  # 0
actionlint .github/workflows/live-catalogue-guard.yml                                        # 0

npm run check:live-catalogue    # 1   ← NOT a gate failure. Four real production breaches.
```

**`npx prisma generate` is required first in a fresh worktree.**

**Proven able to fail, not merely to pass:**

- **Mutation control.** Replacing the contradiction guard with `if (false)` turned the suite red
  (exit 1) on exactly the new test; source restored byte-identical (`grep -c "if (false)"` → 0).
- **The workflow fail step was exercised as shell, not read**
  (`~/.claude/jobs/f37f7054/tmp/wf-failstep-test.sh`). Status 0 **only** for code 0 with a clean
  parseable report. Status 1 for codes 1, 2, 137, empty — and for code 0 with a contradictory,
  unparseable, or missing report.

---

## 7. Deferred + open questions

**Blocking (agent-owned)**

| Item | Owner | Blocking | Why |
|---|---|---|---|
| Push the 7 commits | A | the drain review | A PASS for an older SHA is invalid. The review must bind the exact final HEAD; writing *this* handoff moves HEAD again, so the next session must re-review at the new HEAD. |
| PR #682's head still carries the `push:` defect | A | the push above | Body carries a **do not merge as-is** warning. Updated body drafted at `~/.claude/jobs/f37f7054/tmp/pr682-body.md` — apply with `gh pr edit`, which needs no commit. |

**Deferred (agent-owned, unblocked)**

| Item | Owner | Why |
|---|---|---|
| **`main` is RED on E2E** — three specs assert retired hero copy | A→F | `c9f8028d` set the H1 to "Become the technician every job site trusts."; `e2e/carsi-journeys.spec.ts:33`, `e2e/smoke.spec.ts:37`, `e2e/pre-production.spec.ts:268` still expect the old line. **New detail this session:** the H1 is split word-by-word across `<HeroWord>` components (`AnimatedHero.tsx:166-212`), so accessible-name and `toContainText` assertions match it while a naive innerHTML substring check will not. Fix the strings; never loosen the assertion. |
| CI-P1-001 root cause | A | Still open. See §9 — the load hypothesis got *weaker* this session, not stronger. |
| The cursor-agent misdispatch (filed in BACKLOG) | A | Two concrete fixes named in the entry: mark the `-` stdin rule codex-specific in `pr-release-gate/SKILL.md`, and smoke-test prompt delivery before any real dispatch. |
| BACKLOG #36 — `bootstrap.sh` must install the pre-push hook | A | Unblocked, untouched this session. |

**Open questions (founder-owned)**

| Question | Why |
|---|---|
| **Confirm the final homepage hero wording** | Unblocks the E2E fix. |
| **DECISIONS #16 — prod-DB access** | The four live breaches cannot be cleared without it, so the scheduled job stays red by design. |
| **Merge PR #682, and whether to hold it** | Once the `push:` fix lands, the founder's stated merge precondition is **met**. The PR is not draft and estate automation force-readied it once already. After the push its only red check is E2E — so whoever fixes E2E also removes the last thing stopping an automatic squash-merge. The defect was self-protecting; after the push that protection is gone. State explicitly whether a hold is wanted. |

---

## 8. Pick up here

**Start here**

1. `git rev-parse HEAD` — do not trust any SHA written in this file's prose. Writing this handoff
   moved HEAD past `2cc95296`.
2. Read `~/.claude/jobs/f37f7054/tmp/review-8f5f8ba2/reviewer-report.json`. If `checklist` items
   read "Initial report created before file review", the review **did not complete** — that is a
   skeleton, not a verdict, regardless of the `FAIL`.
3. Dispatch a fresh review bound to the current HEAD via
   `~/.claude/jobs/f37f7054/tmp/dispatch-review.sh <brief> <workspace> <log>`. Update the brief's
   `head_sha` first.
4. On PASS: issue the receipt, **copying the report out of the worktree first** and pointing
   `--review-report` at the copy — the receipt stores that path and the push hook re-reads it.
5. Push, then `gh pr edit 682 --body-file ~/.claude/jobs/f37f7054/tmp/pr682-body.md`.

**Do not redo**

- The P1 fix and its mutation control. Both are committed in `2cc95296` and evidenced in §6.
- The positive control. It already discharged today for this reviewer: it named its planted
  target at `live-catalogue-guard.yml:86` with a real shell reproduction.
- Diagnosing CI-P1-001 as fd exhaustion or process exhaustion. Both measured out (§9).
- Re-deriving that `cursor-agent` needs a positional prompt. Use `dispatch-review.sh`.

**First command to run**

```bash
cd "/Volumes/Storage Unit/CARSI/.claude/worktrees/fix-674-review-findings" && git rev-parse HEAD && npx prisma generate && npm run test:live-catalogue
```

---

## 9. Risk notes

- **Seven commits live only on this machine**, in one worktree. The remote has `3ab22784` and
  nothing after it. This is the single largest risk here, and it is now one commit worse than the
  handoff that preceded it.
- **A misdispatched reviewer wrote code into this repo.** Dispatching `cursor-agent` with a
  trailing `-` (the `codex exec` convention) made `-` the literal prompt; the agent read
  `CLAUDE.md`, obeyed "all work comes from the top of the backlog", and with `--force` began
  implementing BACKLOG #2 — ten CEC packs, edits to `BACKLOG.md`/`DECISIONS.md`/`GOAL.md` and to
  `scripts/generate-cec-submission.ts`. Both runs exited **0** and reported success in fluent
  prose. **Neither wrote the required report file, and that absence was the only signal.** Contained
  to two disposable worktrees; the branch worktree was untouched and nothing was committed or
  pushed by those agents. They also symlinked the **main checkout's** `node_modules` into the review
  worktrees; the symlinks were removed and the shared tree verified unchanged.
- **My load-contention hypothesis for CI-P1-001 got weaker, not stronger.** `npm run test:unit`
  passed at 66.7s *while* a cursor-agent reviewer was running — slower under load, but not flaky.
  Combined with four clean runs, the honest position is that CI-P1-001 **did not reproduce at all
  this session** and remains unexplained. Do not close it on that basis; equally, do not repeat my
  earlier framing that load is the likely cause.
- **A control FAIL is not self-evidently a control passing.** The brief instructs the reviewer to
  write a fail-closed skeleton first, so a crashed or killed run leaves a `FAIL` behind that proves
  nothing. Only `blocking_findings` naming the planted defect discharges it. This nearly misled me.
- **`git push` re-runs all seven test commands** — `pr_release_gate.py:845` calls `verify_receipt()`
  with the default `rerun_tests=True`, and the hook is registered on this machine
  (`~/.claude/settings.json`, PreToolUse). The push is a second CI-P1-001 exposure, not a formality.
- **The control worktree at `fd049935` contains a deliberately planted defect** and must never be
  merged or pushed. Remove it with `git worktree remove --force`.
- Repo-wide `npm run lint` still exits 1 with ~14,777 pre-existing problems (BACKLOG #37); the
  changed files lint clean.
- **From 03:00 UTC this repo gains a daily red alarm** that no code change can clear until
  DECISIONS #16 is resolved. That is the honest design, and it starts tonight.

---

## 10. Handoff quality check

Every exit code in §6 came from a command run this session in this worktree, and the seven gates
were run through a mirror of the gate's own executor rather than by hand. `SHIPPED` was withheld
because seven commits are unpushed and the confirming review is incomplete — the code is better
than it was, and saying "shipped" would hide that none of it has left this machine.

Two things are recorded against my own interest: the reviewer misdispatch, in which agents I
launched wrote code into a checkout and reported success while having done no review; and the
weakening of my own CI-P1-001 load hypothesis, which the evidence no longer supports as well as it
did when I wrote it into BACKLOG.md earlier today. One thing is recorded in my favour only because
it is evidenced: the P1 was real, reproduced on unmodified code, and is fixed with a test proven
able to fail.

Nothing was merged, no production was mutated, no branch deleted, and no gate was weakened,
bypassed or re-run until green.

**Handoff complete. Next safe action: re-derive HEAD, dispatch a review bound to it, and push only
on a PASS whose `blocking_findings` is empty and whose checklist carries real evidence.**

---

## 11. Update — the drain review returned a P0 after this handoff was committed

This handoff was committed at `5ad6a584` while the drain review of `2cc95296` was still running.
It has since finished, and it changes the picture. Recorded here rather than by editing the
sections above, so the sequence stays visible.

**Drain review verdict: FAIL**, head `2cc95296`, reviewer `gpt-5.5`, session
`cursor-review-drain-2cc95296-2026-08-20`. Coverage complete (`not_reviewed: []`). Two blocking
findings:

- **P0 — `P0-WORKFLOW-TRUSTS-NONARRAY-VIOLATIONS-AS-CLEAN`** (`live-catalogue-guard.yml:91`). The
  P1 fix was incomplete and **bypassable in both halves**. `(r.violations || []).length` is
  `undefined` when `violations` is an object — falsy — so the fail step printed
  `Live catalogue clean.` and exited 0, and `renderSummary` took the clean branch, on a report
  naming a live breach. `|| []` catches only `null`/`undefined`; every truthy non-array passes
  through. Reproduced on the "fixed" code before anything was changed.
- **P1 — `P1-HANDOFF-VERIFICATION-COUNTS-ARE-STALE`.** The previous handoff and BACKLOG #30
  carried suite counts (167, 168) that no longer matched the head.

**Both drained in `3d11b5e9`.** Shape is now validated before contents in both halves: `violations`
and `notes` must each be an array, or the run is a guard defect — rendered loudly with the shape
named, and failed closed by the workflow. The stale counts were **annotated, not rewritten**: a
handoff records what was observed, so the original figures stand with a forward pointer to the
then-current 177 checks (156 guard + 21 summary).

> **Annotation, continued.** Round 3 of review found a further P1 at `1139d5af`
> (`P1-SUMMARY-MALFORMED-REPORT-SHAPE-CAN-CRASH`), whose fix adds 11 more checks. The suite is
> **188 checks (156 guard + 32 summary)** from that fix onward. The 169 in §6 and the 177 above
> both stand as written — each records what was true when it was written. Extend this chain;
> never rewrite a figure in place.

**Evidence at `3d11b5e9`:** all seven gates 0 (type-check 56.6s, test:unit 44.6s), `eslint` 0,
`actionlint` 0. A mutant replacing the shape check with `if (false)` turns the suite red on all 8
new checks (exit 1); source restored byte-identical. The fail step was exercised as shell across
object, string, number, null, missing and array-shaped `violations` plus object-shaped `notes` —
status 0 **only** for a genuinely clean array report, status 1 for every other shape and for codes
1, 2, 137 and empty (`~/.claude/jobs/f37f7054/tmp/wf-failstep-test2.sh`).

**What this means for the next session — read this before quoting anything above.**

1. **HEAD is `3d11b5e9`, not `2cc95296`.** Nine commits unpushed.
2. **`3d11b5e9` has NO review.** The P0 fix is evidenced but not independently reviewed. Per the
   release law a fresh review must bind the exact final HEAD before any push.
3. **The lesson, stated plainly: the P1 fix passed a green suite while still carrying a P0.** The
   tests written for it asserted the behaviour its author had thought of. Only an adversary
   instructed to attack the *shape* found the one he had not. Do not read "gates green" as
   "correct" on this branch.
4. The positive control has now paid for itself twice: it found the original P1, and the drain
   round it made trustworthy found the P0 inside the fix for that P1.

**Revised next action:** dispatch a review bound to `3d11b5e9` (or to HEAD if it has moved),
using `~/.claude/jobs/f37f7054/tmp/dispatch-review.sh` with the brief's `head_sha` updated; drain
anything it finds; push only on a PASS with empty `blocking_findings` and a checklist carrying real
evidence.
