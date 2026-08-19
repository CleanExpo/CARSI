# Session Handoff — CEC branch reviewed at head, FAILED, blocked on two founder decisions

**Timestamp:** 2026-08-18 22:45 AEST
**Machine:** `Phills-Mac-mini.local`
**Repo:** CARSI — worktree `/Volumes/Storage Unit/CARSI/.claude/worktrees/overnight-gate0-20260818`
**Branch:** `worktree-overnight-gate0-20260818` @ `4777a0af`
**Reviewed head:** `83091a05` (the commit before the report was committed)
**Scope:** resume `handoff-20260818-215304`; take the 18-commit CEC branch through the release gate

---

## 1. Summary

**State: WIP-BLOCKED.** The branch is complete and green, was independently reviewed at its
exact head by an executing reviewer, and **FAILED on two P1s that no agent may fix.** Both are
already recorded in the branch's own `DECISIONS.md` as OPEN founder items with due dates.

**Nothing was pushed. No receipt was issued. No PR was opened.** That is the release law
working, not a stall: a FAIL verdict means queue the work and never self-certify.

The previous handoff called this branch "one re-review from landing". That was optimistic. It
is one re-review plus **two founder decisions** from landing.

---

## 2. What changed this session

**The branch was merged onto current `origin/main` BEFORE review.** It was 1 commit behind
`cea8b7f9` — the NPM Audit dependency fix. Reviewing at the old head would have bound a receipt
to a commit predating that fix; the PR would have opened red on NPM Audit, someone would have
updated the branch, and the receipt would have died on the new SHA. That is precisely the
"receipt is stale for current HEAD" trap already blocking the `~/.claude` push. Merge was clean
(deps-only, zero overlap with the 87 changed files).

- pre-merge head `d4095ea0` → merged head **`83091a05`** → report commit **`4777a0af`**
- base is now exactly `origin/main` = `cea8b7f9`, 0 behind

---

## 3. The verdict

`docs/reviews/reviewer-report-83091a05.json`, committed at `4777a0af`.
Reviewer: **gpt-5.5** via `cursor-agent -p --force` (executing, not read-only).
Bound to `base cea8b7f9 → head 83091a05`. **Verdict FAIL, 2 blocking P1s, both anchored.**

Citations verified mechanically: `verify_reviewer_citations.py` exit **0** — both findings quote
real post-image lines under the file they name.

| id | finding |
|---|---|
| `P1-COURSES-DISCIPLINE-MAP-STILL-SHIPS` | `/courses` still renders the IICRC discipline-acronym map (WRT/CRT/ASD/OCT/CCT/FSRT/AMRT) via `IICRCDisciplineMap` + `AcronymTooltip`. The reviewer ran `check:iicrc-terminology` **and** `check:iicrc-compliance` and got **exit 0 from both** — proving the source-line guards cannot see copy assembled through JSX. |
| `P1-TERMS-STILL-ASSERT-UNAPPROVED-CEC-STATE` | `/terms` §5 still states courses ARE IICRC-approved for CECs and that CARSI reports completions to the IICRC, while `check:cec` reports `0 entries (0 approved)`. |

**Checklist:** `coverage-ledger` PASS · `weakened-checks` PASS · `blast-radius` PASS ·
`outbound-actions` PASS · `plan-conformance`, `mutation-control`, `guard-falsification`,
`clean-environment-suite` all **FAIL (partial)**.

Read in full, all four FAILs are the reviewer declining to claim more than it did, not defects
it found: it performed real mutation control on `checkout-redirect.ts` (mutant failed 5 of 14
tests, restored, 14 of 14 passed), a real guard plant (exit 1, above), and clean-environment runs
of `test:unit`, `type-check` and `check:cec` under `env -i` — then marked each item FAIL because
it did not repeat the exercise across all 87 files and all 21 gates. `plan-conformance` is the
one substantive FAIL: a release candidate that knowingly ships open licence-critical public
surfaces does not conform.

**Coverage: 51 of 87 files read.** The report lists all 36 unread paths with a reason each
(10 CEC submission packs grep-checked only; 5 covered by the unit suite but not line-read; the
rest deprioritised after the P1s). An under-covered review that says so is usable; the coverage
gap must be closed in the next round even if the P1s resolve.

---

## 4. Why this is founder-blocked, not agent-blocked

Both P1s cite `DECISIONS.md` rows that carry the founder's own "No default" ruling:

- **#18 `/courses` discipline map** — *"removing or reframing a feature on the flagship
  commercial page is a product and SEO decision, not a copy fix."* Due 2026-08-22, OPEN.
- **#17 `/terms` §5** — *"a published contract. Agents drafted the Refund Policy it now links
  to, but will not rewrite the Terms themselves."* Due 2026-08-24, OPEN.

An agent editing either would be overriding an explicit founder reservation.

**Both violations are PRE-EXISTING on `origin/main` and are live on production right now.**
Verified: `IICRCDisciplineMap.tsx` exists on `origin/main`, `/courses` renders it there (2
references), and `/terms` on `origin/main` already carries both the "approved by the Institute
of Inspection…" and "reports CEC completions" assertions. **The branch introduces neither.**

This reframes the decision. Holding this branch does **not** reduce live licence exposure by one
word — the banned copy ships today either way. What holding it *does* cost: the
`check-iicrc-terminology` fix (`7795faba`) stays stranded, so the guard remains vacuous on the
main checkout, and ten CEC submission packs stay unsent. DECISIONS #17 and #18 are therefore not
"blocking a branch" — they are **live production licence risk with founder due dates this week
(22 and 24 August)**, and the branch is the thing that would start closing the guard gap.

**The structural lesson, which outlives this branch:** both guards exit 0 while the banned copy
ships. `check:iicrc-terminology` and `check:iicrc-compliance` scan **source lines**; the
offending text is assembled at render time through JSX components. A source-line regex can
never discharge a rendered-surface claim. This is the same gap `check:live-catalogue` (the other
branch) was built to close — and it is more evidence that repo-scanning guards are the wrong
instrument for a licence claim about what production actually serves.

---

## 5. Gates — all green, and that is not the blocker

At `83091a05`, in the worktree, **21/21 exit 0**: `type-check`, `test:unit` (145 files,
**1071 tests, 0 skipped**), `check:secrets`, `check:au-english`, `check:standards-claims` +
test, `check:iicrc-terminology` + test, `check:iicrc-compliance` + test, `check:cec` + test,
`check:cec-surfaces` + test, `check:designations`, `check:course-completeness` + test,
`check:sources` + test, `check:course-visibility` + test.

`check:iicrc-terminology` is **armed here**, and the reviewer proved it independently rather
than taking my word: it planted one of the banned IICRC-certification selling claims listed in
`CLAUDE.md` (the exact literal is deliberately not reproduced here — a canary string sitting in
a tracked file is a violation waiting for the guard's scanned scope to widen) in tracked
`public/llms.txt`,
ran the guard, and recorded **exit 1 naming the planted line**, then restored the file. The
guard also prints `✓ IICRC CEC terminology guard passed.` on clean input.
On the main checkout at `guard/live-catalogue-licence` the same command prints **nothing at
all**, because `isCli` compares a percent-encoded `import.meta.url` against a raw
`process.argv[1]` and the checkout path contains a space. The fix (`pathToFileURL`, commit
`7795faba`) lives on THIS branch — so the vacuous guard stays vacuous on the main checkout until
this branch lands.

---

## 6. Reviewer-tooling findings (durable, recorded in `~/openrouter-swarm/CALIBRATION.md`)

**A prediction I made and then refuted by measurement.** I measured the `~/openrouter-swarm`
swarm missing a planted P0 open-redirect at 55k chars and catching it at 10k, and predicted the
ceiling would transfer to the canonical `~/.claude/skills/pr-release-gate/scripts/swarm_review.py`
because that script does no chunking. **Tested: false.** Same planted defect in the full
283,651-char diff — all three canonical reviewers caught it and anchored the exact mutated line
(qwen3.5-plus 79,906 prompt tokens; nemotron-3.5-lightning 79,681; deepseek-v4-pro 76,772).
The ceiling is a property of **model tier and prompt contract**, not diff size.
*Caveat: the canonical run was given a `--focus` hint naming the target file; the comparison is
not fully controlled.*

**A confirmed bug worth more than the calibration.** That canonical run then crashed:

```
TypeError: unhashable type: 'dict'    # swarm_review.py:418, in main()
```

Line 418 builds `coverage.reviewed` as a set comprehension assuming string entries; a model
returned objects. **Three valid reviews and a real P1 found by all three were discarded — the
merged report was never written.** The reviewer worked and the harness threw the result away.
Fix: coerce each entry to its path string before adding to the set. This is the release gate's
own **first-choice** reviewer.

---

## 7. Pick up here

1. **Founder resolves DECISIONS #17 and #18.** Nothing else unblocks this branch.
2. Once resolved, implement, re-run the 21 gates, and dispatch a **fresh review at the new
   head** — the `83091a05` report is void the moment HEAD moves (it already has, to `4777a0af`).
3. The next review must also **close the 36-file coverage gap**, not just re-check the P1s.
4. Fix `swarm_review.py:418` before relying on the canonical swarm.
5. Independently of this branch: the rendered-surface guard gap (§4) deserves a ticket — source
   scanning cannot discharge licence claims about JSX-assembled copy.

**Do not redo**

- The merge onto `origin/main`. Done, clean, and it is what keeps the next receipt shippable.
- The gate battery at `83091a05`. 21/21, 1071 tests, 0 skipped.
- The reviewer control. gpt-5.5 caught a planted origin bypass at the correct line and
  independently flagged a userinfo variant that was not planted — its FAIL is evidence, not
  silence.
- The canonical-swarm calibration. Measured, refuted, recorded.

---

## 8. Risk notes

- **This branch has now failed review twice** — once at `5f1f8914` (reviewer could not execute
  code) and once at `83091a05` (two real P1s). The first failure was a process defect; this one
  is the product. Do not read "FAIL again" as the gate being noisy.
- **Both licence guards exit 0 on a surface that carries banned branding.** Anyone quoting
  `check:iicrc-terminology` or `check:iicrc-compliance` as proof that `/courses` is clean is
  quoting a check that structurally cannot see it.
- **36 files were never read.** If the P1s are fixed and a reviewer returns PASS without
  widening coverage, that PASS covers 59% of the change.
- `guard/live-catalogue-licence` is untouched by this session and remains READY-TO-SHIP at
  `511a91bf` with a valid receipt, still awaiting the founder's PR decision.
- The `~/openrouter-swarm` repo still holds the uncommitted false-PASS fix, plus `CALIBRATION.md`
  added this session. Separate repo, own gate.

---

## 9. Handoff quality check

Every claim traces to a command run this session. The verdict is quoted from a report authored
by the reviewer, never edited by me; its citations were verified mechanically (exit 0). The
merge, the 21 gate exit codes, the 1071/0-skipped test counts, and the swarm token counts are
all tool output. The prediction I got wrong is recorded as refuted rather than quietly dropped.
Nothing was pushed, no receipt issued, no PR opened, no production mutation.

**Next safe action: founder resolves DECISIONS #17 and #18. Until then this branch cannot ship,
and no amount of agent work will change that.**
