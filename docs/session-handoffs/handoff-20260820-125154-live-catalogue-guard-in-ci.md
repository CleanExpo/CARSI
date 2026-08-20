# Session Handoff — the live-catalogue guard runs on a schedule; its fix is stuck behind a gate flake

**Timestamp:** 2026-08-20 12:51 AEST
**Machine:** `Phills-Mac-mini.local`
**Repo:** CARSI — worktree `/Volumes/Storage Unit/CARSI/.claude/worktrees/fix-674-review-findings`
**Branch:** `feat/ci-live-catalogue-guard` @ `3c9cddbb` — tree clean, stash empty,
**3 commits unpushed** (remote is at `3ab22784`)
**Scope:** founder said "Merged, next?" after merging PR #674 → took BACKLOG #30

---

## 1. Summary

**State: WIP-BLOCKED.**

BACKLOG #30 is built, independently reviewed, and **observed working against production**. It is
not fully landed: the head on PR #682 carries a defect I found *after* pushing, and its fix
cannot be pushed because the release gate fails non-deterministically on this machine.

**Definition-of-Done:** 1 **partial** (built and PR'd, but the pushed head has a known defect) ·
2 **yes** (Phase 0 green, §6) · 3 **yes** (tree clean, stash empty) · 4 **partial** (PR #682
exists; 3 commits including the fix are unpushed) · 5 **yes** (workflow run `32295824919`
observed reaching production and failing correctly). Any "no"/partial forbids SHIPPED.

Two findings this session are worth more than the feature itself: **`main` is currently red on
E2E** for reasons unrelated to this work, and the release gate is **non-deterministically
unusable on this checkout**.

---

## 2. Where it started

The founder merged PR #674 (squashed to `1057be16`) and asked "next?". I verified the merge
landed — the guard and its tests are byte-identical on `main` — then took **BACKLOG #30**, the
top unblocked item: `check:live-catalogue` is the only guard that reads production, and it ran
nowhere automatically.

---

## 3. Decisions locked + what shipped

**Pushed:** `feat/ci-live-catalogue-guard` @ `3ab22784` → **PR #682**
(https://github.com/CleanExpo/CARSI/pull/682), receipt
`PR_RELEASE_GATE_PASS head=3ab2278498d0798db9990c742a9652214815eca2 reviewer=gpt-5.5`.

**NOT pushed** — 3 commits, gate-blocked (§7): `e3a3b49e` (the fix), `01c8c61c`, `3c9cddbb`.

**Decisions locked:**

- **No credential gate on this workflow.** The sibling `live-cec-guard.yml` is a silent no-op
  until a founder sets `LIVE_CEC_CHECK`, because it needs a prod DB URL. This one reads a public
  sitemap and needs nothing — so a config flag could only ever silently disable a licence guard,
  which is the defect this family exists to prevent.
- **No baseline / allow-list.** Production has four real breaches (BACKLOG #31), so the job is
  honestly red until they are fixed. An exemption that outlives its reason is how unapproved CEC
  hours reached 22 courses. Instead the summary separates **NEW** from **known**, so a red run
  stays triageable rather than becoming noise. `KNOWN_IN_BREACH` annotates and never suppresses;
  a test pins exactly that.
- **Exit 2 fails the job as loudly as exit 1.** "I could not look" must never render as "nothing
  is wrong".
- **No `npm ci` in the job.** Everything it runs imports only `node:` builtins, so installing
  ~1,700 packages would add a supply-chain surface and a failure mode for nothing. Confirmed on a
  clean runner.
- **No `push:` trigger** — reversed after observing it. See §9; this is the defect on the pushed
  head.

---

## 4. Key files

| File | Status |
|---|---|
| `.github/workflows/live-catalogue-guard.yml` | Created — daily 03:00 UTC + `workflow_dispatch`. **On `3ab22784` it still has the `push:` trigger**; removed in unpushed `e3a3b49e` |
| `scripts/live-catalogue-ci-summary.mjs` | Created — step-summary renderer, annotation-only, never decides pass/fail |
| `scripts/live-catalogue-ci-summary.test.mjs` | Created — 11 checks, mutation-controlled |
| `package.json` | Modified — `test:live-catalogue` now runs both suites (167 checks total) |
| `BACKLOG.md` | Modified — #30 done; #33/#34 corrected to done; CI-P1-001 and the E2E finding filed |
| `docs/session-handoffs/handoff-20260820-125154-*.md` | Created — this file |

---

## 5. Running state

- **No background processes.** All review agents and watchers completed.
- **Review worktrees deleted**, `git worktree prune` run. Remaining: the main checkout, this
  worktree, and `overnight-gate0-20260818`.
- **PR #682 is `draft=false`** — estate automation force-readied it. I could not convert it back
  (`gh pr ready --undo` is itself blocked by the stale receipt). It cannot merge on green because
  two checks are failing, so the defect is currently self-protecting — but do not rely on that.
- **The main checkout is stale**, at `92be1290` on `guard/live-catalogue-licence`. `main` has
  since moved to `1057be16`.
- Phase 0 logs: `~/.claude/jobs/f37f7054/tmp/h-*.log`.

---

## 6. Verification — exact commands

All run this session in this worktree on `3c9cddbb`:

```bash
cd "/Volumes/Storage Unit/CARSI/.claude/worktrees/fix-674-review-findings"
npm run type-check              # 0   (MANDATORY per CLAUDE.md)
npm run test:unit               # 0   143 files, 1060/1060
npm run test:live-catalogue     # 0   167 checks (156 guard + 11 summary), 2 suite-summary lines
npm run check:iicrc-terminology # 0
npm run check:iicrc-compliance  # 0
npm run check:cec               # 0
npm run check:designations      # 0
npx eslint scripts/live-catalogue-ci-summary.mjs scripts/live-catalogue-ci-summary.test.mjs  # 0

npm run check:live-catalogue    # 1   ← NOT a gate failure. 80 URLs, 4 REAL breaches.
```

**`npx prisma generate` is required first in a fresh worktree**, and again after pulling a schema
change — a stale client surfaces as `Cannot find module '@/generated/prisma/client'` or a missing
`offerEmailSentAt`, which looks like a code defect and is not.

**The demonstrable outcome (DoD 5):** GitHub Actions run
[`32295824919`](https://github.com/CleanExpo/CARSI/actions/runs/32295824919) — dispatched against
the real site. It ran the guard's own 156-check suite on a clean runner **with no `npm ci`**, reached
production, captured exit 1, and failed with the licence error rather than an infrastructure one.
Every step behaved as designed. That is the guard observed working, not merely shipped.

**Proven able to fail, not just to pass:** a mutant hiding NEW violations turns the summary suite
red (restored byte-identical); the fail step returns 0 only for exit `0` — `1`, `2`, `137` and an
**empty/unset** `exit_code` all fail closed.

---

## 7. Deferred + open questions

**Blocking (agent-owned, but gated)**

| Item | Owner | Blocking | Why |
|---|---|---|---|
| Push `e3a3b49e`, `01c8c61c`, `3c9cddbb` | A | **CI-P1-001** | The release gate's `npm run test:unit` fails inside its sequential run. Green standalone 5×, red in-gate 4×. I stopped rather than re-run until green or drop the test from the receipt — both are self-certification. |
| PR #682's head carries the `push:` trigger defect | A | the push above | Body carries a **do not merge as-is** warning. Alternative: delete the `push:` block from the workflow before merging. |

**Deferred (agent-owned, unblocked)**

| Item | Owner | Why |
|---|---|---|
| **`main` is RED on E2E** — three specs assert retired hero copy | A→F | `c9f8028d` changed the H1 to "Become the technician every job site trusts."; `e2e/carsi-journeys.spec.ts:33`, `e2e/smoke.spec.ts:37`, `e2e/pre-production.spec.ts:268` still expect "Professional training that fits the workday.". **Until fixed the landing page has no working smoke test.** Filed, not fixed — the hero changed twice in three commits (`c9f8028d`, `1e88d119`), so the founder should confirm final wording before three assertions pin to it. Fix the strings; never loosen the assertion. |
| CI-P1-001 root cause | A | Next step: `--reporter=verbose` inside the gate context, and check `ulimit -u` (4000 soft) against fork count under the harness's ~57 resident node processes. |
| BACKLOG #36 — `bootstrap.sh` must install the pre-push hook | A | Unblocked. |
| CLC-P2-004/005/006 | A | Filed, accepted, not fixed — reasoning in BACKLOG.md. Do not silently "fix" any without the ruling each names. |

**Open questions (founder-owned)**

| Question | Why |
|---|---|
| **Confirm the final homepage hero wording** | Unblocks the E2E fix above. |
| **DECISIONS #16 — prod-DB access** | The four live breaches are unreachable without it, so the new scheduled job stays red until this is resolved. That is by design, but it means a daily red alarm from tomorrow 03:00 UTC. |
| Merge PR #682 | Only after the `push:` trigger is gone. `main` deploys to production. |

---

## 8. Pick up here

**Start here**

1. Re-run the §6 gates. Expect all 0 except `check:live-catalogue`, which is honestly 1.
2. Retry the receipt for `3c9cddbb`. If `npm run test:unit` fails inside the gate again, **do not**
   re-run until green and **do not** drop it from the `--test` list — work CI-P1-001 instead.
3. Once pushed, PR #682 is mergeable-by-founder and the `push:` defect is gone.

**Do not redo**

- The workflow design decisions in §3 — each has a recorded reason, and two (no credential gate,
  no baseline) are deliberate refusals of the easy option.
- The live dispatch. Run `32295824919` already proved the wiring end to end.
- The independent review. `e3a3b49e` has a PASS (8/8 checklist, zero blocking findings, plus
  `actionlint` with its own failing positive control). Its report is preserved at
  `~/.claude/jobs/f37f7054/tmp/reviewer-report-e3a3b49e.json` — the gate reads it, and it must
  never be re-authored by an implementing agent.
- Diagnosing CI-P1-001 as memory, oversubscription, or this branch. All three ruled out with
  evidence (§9).

**First command to run**

```bash
cd "/Volumes/Storage Unit/CARSI/.claude/worktrees/fix-674-review-findings" && npx prisma generate && npm run type-check && npm run test:live-catalogue
```

---

## 9. Risk notes

- **Three commits live only on this machine**, in one worktree. The remote has `3ab22784` and
  nothing after it. This is the single largest risk here.
- **PR #682's pushed head is defective and the PR is not draft.** The `push:` trigger attaches
  the guard as a PR check whose verdict is about the live catalogue, not the PR's code — so any
  PR touching the guard carries a red check it cannot clear, and a red check nobody can act on is
  one everybody learns to scroll past. I only found this by dispatching the real workflow; reading
  the YAML did not reveal it.
- **CI-P1-001 is a gate that cannot be trusted to run.** Symptom is always
  `[vitest-pool]: Failed to start forks worker for src/components/admin/AdminCcwSignInsClient.test.tsx`
  (that file passes alone in 1.4s), sometimes surfacing as a 5s `Test timed out` in
  `src/lib/seo/course-marketing.test.ts`. **Ruled out:** memory (70% free, zero swap),
  oversubscription (reproduced at `--maxWorkers=4` on a 10-CPU box), and this branch (the diff
  touches **zero** files under `src/`; `vitest.config.ts` globs only `src/**`). CI's own
  `Unit Tests` job passes on a clean runner.
- **I deleted a reviewer report mid-session** by removing its worktree during cleanup, and had to
  re-run the review to regenerate it. Copy the report out of the worktree before cleaning up.
- **One hypothesis I stated was wrong**: I predicted reduced worker concurrency would fix the gate
  flake; it failed at `--maxWorkers=4` too. Recorded rather than quietly dropped.
- **From tomorrow 03:00 UTC this repo gains a daily red alarm** that no code change can clear
  (BACKLOG #31 needs prod-DB access). That is the honest design, but it is a new recurring signal
  the founder has not seen before.
- Repo-wide `npm run lint` exits 1 with ~14,777 pre-existing problems (BACKLOG #37); changed files
  lint clean.
- **The `AAA-S` rung for this work:** `AAA-S(gate='.github/workflows/live-catalogue-guard.yml',
  red-observed=run 32295824919, prod-observed-by=gpt-5.5-high + the GitHub runner)` — Rung A holds
  (the gate was watched failing on the live defect, on real infrastructure, by an agent that did
  not build it). An unqualified "AAA" would still be `[UNCONFIRMED]`.

---

## 10. Handoff quality check

Every exit code in §6 came from a command run this session in this worktree, logged to
`~/.claude/jobs/f37f7054/tmp/h-*.log`. `SHIPPED` was withheld because three commits are unpushed
and the pushed head is defective — the feature works, and saying "shipped" would hide that its
fix is stranded. The gate flake is reported as an unsolved blocker with three eliminated
hypotheses rather than as "flaky, re-run it", and my one wrong hypothesis is recorded. The E2E
breakage is attributed to `main` with the commit that caused it, and explicitly *not* claimed as
this branch's fault — with the evidence for that attribution. Nothing was merged, no production
was mutated, no branch deleted, and no gate was weakened or bypassed.

**Handoff complete. Next safe action: retry the receipt for `3c9cddbb`, and if `npm run test:unit`
fails inside the gate again, work CI-P1-001 rather than re-running until it passes.**
