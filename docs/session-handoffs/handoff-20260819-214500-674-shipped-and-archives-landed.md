# Session Handoff — #674 drained and pushed, both stranded branches archived

**Timestamp:** 2026-08-19 21:45 AEST
**Machine:** `Phills-Mac-mini.local`
**Repo:** CARSI — worktree `/Volumes/Storage Unit/CARSI/.claude/worktrees/fix-674-review-findings`
**Branch:** `fix/674-review-findings` @ `54e5344d` — **pushed** to `guard/live-catalogue-licence`,
tree clean, stash empty, PR #674 green and `CLEAN`
**Scope:** founder ask — "clear all old completed works by pushing and committing, ensure the work
is at a AAA rating, clean and clear data to work with"

> Supersedes `handoff-20260819-211443-*`, which was written while the last review round was still
> running and correctly recorded the state as WIP-BLOCKED at that moment. Both are kept: the
> earlier one is the honest snapshot of a session that had not yet earned its push.

---

## 1. Summary

**State: SHIPPED** — for everything this session owned. Merge itself remains founder-only.

**Definition-of-Done:** 1 **yes** · 2 **yes** (gates green, §6) · 3 **yes** (tree clean, stash
empty) · 4 **yes** (pushed, receipt-bound, PR #674 open) · 5 **yes** (behaviour change
demonstrated end to end against live production).

Delivered: 7 real licence bypasses closed — each **watched failing before being fixed** — 3 of
which were the CodeRabbit findings blocking #674, and 4 found by independent review. All review
threads on #674 resolved. Both stranded local branches archived to the remote. Housekeeping done.

---

## 2. Where it started

One open PR (#674) merge-blocked on three unresolved CodeRabbit threads; an untracked handoff
doc; two local-only branches holding 23 commits that existed on no remote; two prunable
worktrees; local `main` 4 commits behind.

---

## 3. Decisions locked + what shipped

**Shipped to the remote:**

| Ref | What |
|---|---|
| `guard/live-catalogue-licence` @ `54e5344d` | PR #674 — 34 commits ahead of `main`; the live-catalogue licence guard plus 7 bypass fixes. 14/14 CI green, `CLEAN` |
| `archive/overnight-gate0-20260818` @ `4777a0af` | 19 commits incl. BACKLOG #2 (ten IICRC CEC submission packs) — previously local-only |
| `archive/vacuous-cli-guards-20260819` @ `df74a462` | 4 commits — previously local-only |

Receipt: **`PR_RELEASE_GATE_PASS head=54e5344d9b8cdd2fcb9131882e8c8ca16c856504 reviewer=gpt-5.5`**
(an earlier receipt bound `70c0253f`; the docs commits that followed required a re-bind, because
a PASS binds to an exact SHA)

Housekeeping: 2 stale worktrees pruned, local `main` fast-forwarded to `86165d5e`.

**Decisions locked:**

- **The independent reviewer on this machine is `cursor-agent --model gpt-5.5-high`.** Codex is
  credit-exhausted until 2026-08-20 13:33; the OpenRouter route needs a key this session could
  not route into the process (classifier + worktree-isolation both refused). Recorded as
  `[[cursor-agent-is-the-working-reviewer]]`.
- **Hand-rolled parsers lose; delegate to the runtime.** Three of four review rounds beat a
  hand-written parser (entity table, invisible-character class, URL tail-splitting). The two
  fixes that delegated — `\p{Default_Ignorable_Code_Point}` and WHATWG `URL` — survived the next
  round. Recorded as `[[hand-rolled-parsers-lose-to-the-runtime]]`.
- **Archive first, review second.** Pushing a branch needs no verdict; an unpushed branch is one
  disk failure from unrecoverable. The two archives had been waiting on a review that never came.

---

## 4. Key files

| File | Status |
|---|---|
| `scripts/check-live-catalogue.mjs` | Modified — 7 bypasses closed; `decodeEntities`, `slugOf`, `parseFetchTimeout`, `cannotAuditReport`, `titleOf` exported |
| `scripts/check-live-catalogue.test.mjs` | Modified — 129 → 157 checks; fixture gained a `sitemapPaths` override |
| `BACKLOG.md` | Modified — CLC-P2-005 and CLC-P2-006 filed |
| `docs/session-handoffs/handoff-20260819-{175333,211443,214500}-*.md` | Created |

**The seven bypasses, each red-observed before the fix:**

| # | Bypass | Source | Fix |
|---|---|---|---|
| 1 | `&#87;RT` / `&#x57;RT` numeric entities | CodeRabbit 367 | `50f831fe` |
| 2 | fetch had no timeout — a hung server hung the audit | CodeRabbit 355 | `77cbc92c` |
| 3 | top-level catch left stdout empty, breaking `--json` | CodeRabbit 507 | `6ad3acf0` |
| 4 | zero-width joiner splitting an acronym | review r1 | `55e658a8` |
| 5 | percent-encoded / query-suffixed slugs | review r1 | `55e658a8` |
| 6 | semicolonless + zero-padded entities; U+034F, U+061C | review r2 | `fe31aa79` |
| 7 | `/courses/wrt/.` dot segment read as slug `"."` | review r3 | `27848c1f` |

---

## 5. Running state

- **No background processes.** All five review rounds completed.
- **No background processes. CI is observed green.** Final SHA `54e5344d`: all **14** checks
  pass (Build Check, E2E Tests, Unit Tests, Frontend Tests, Secret Scan, Trivy, NPM Audit,
  Dependency Review/Verification, Security Summary, Vercel ×2, detect-agent-pr, CodeRabbit).
  `mergeable: MERGEABLE`, `mergeStateStatus: **CLEAN**`, **0 of 7 review threads unresolved** —
  the BLOCKED state that held this PR for two sessions is gone.
- **CodeRabbit's re-review opened 3 further threads** on the superseded 21:14 handoff — a
  committed reviewer account email (Major), a missing supersession note, and a pickup command
  omitting `npx prisma generate`. All three were valid, fixed in `54e5344d`, replied to and
  resolved.
- Review worktrees have been deleted and `git worktree prune` run. Remaining worktrees: the main
  checkout, this one, and `overnight-gate0-20260818`.
- **The main checkout is stale.** It sits at `92be1290` on `guard/live-catalogue-licence`,
  **11 commits behind** the pushed tip (`git rev-list --count 92be1290..54e5344d`). Nothing is
  lost — the remote has everything — but a `git pull` there comes before any work in it.
- This worktree has `node_modules` symlinked and `src/generated/prisma` generated locally;
  `node_modules` is excluded via `.git/info/exclude` (the `.gitignore` rule's trailing slash does
  not match a symlink).

---

## 6. Verification — exact commands

All run this session in this worktree, and re-run by the release-gate recorder against each
receipted SHA — `70c0253f`, then `54e5344d`, then `380684a0` as the docs commits landed. The
counts below are from the runs on the current head:

```bash
cd "/Volumes/Storage Unit/CARSI/.claude/worktrees/fix-674-review-findings"
npm run type-check                 # 0   (MANDATORY per CLAUDE.md)
npm run test:unit                  # 0   142 files, 1056/1056
npm run test:live-catalogue        # 0   157 checks
npm run check:iicrc-terminology    # 0
npm run check:iicrc-compliance     # 0
npm run check:cec                  # 0
npm run check:designations         # 0
npx eslint scripts/check-live-catalogue.mjs scripts/check-live-catalogue.test.mjs   # 0

npm run check:live-catalogue       # 1   ← NOT a gate failure. 80/80 URLs reached,
                                   #     4 REAL live violations (BACKLOG #31).
```

**`npx prisma generate` is required first in a fresh worktree.** Without it `type-check` exits 2
with `Cannot find module '@/generated/prisma/client'` and a cascade of TS7006 implicit-any
errors — environment gap, not defect. It cost time this session; recorded so nobody re-diagnoses
it.

**The production audit is the false-positive control.** It reached 80/80 URLs and reported the
same 4 violations before and after every widening (entity decoding, invisible stripping, URL
normalisation) — so no widening raised a false positive across the 76 clean live titles.

---

## 7. Deferred + open questions

**Deferred (agent-owned, unblocked)**

| Item | Blocking |
|---|---|
| BACKLOG #30 — wire `check:live-catalogue` into CI | Nothing. Still the only guard that sees production; still runs only when a human types it. Highest-value follow-up in this file. |
| BACKLOG #33 — add `tsx` to devDependencies | Nothing. |
| BACKLOG #36 — `bootstrap.sh` must install the pre-push hook | Nothing. |
| Archive branches have no PR and are unreviewed at their heads | Durable now, but still not landed. The BACKLOG #2 CEC packs live there. |
| CLC-P2-004/005/006 | Filed, accepted, not fixed — reasoning in BACKLOG.md. Do not silently "fix" any without the ruling each names. |

**Open questions (founder-owned)**

| Question | Why |
|---|---|
| **Merge #674** | `main` deploys to production on push, so merge is founder-only. Everything agent-owned is done: 14/14 checks pass, 0 unresolved threads, `mergeStateStatus: CLEAN`, receipt `PR_RELEASE_GATE_PASS head=54e5344d reviewer=gpt-5.5`. |
| **DECISIONS #16 — prod-DB access** | 4 courses carry banned IICRC branding live **right now**; 3 are absent from repo seed, so no agent can reach them. Licence-critical, unchanged by this session. |
| DECISIONS #1 / #3 — CEC packs, outreach emails | Deadlines were 2026-08-20; now past. |

---

## 8. Pick up here

**Start here**

1. **#674 is ready for the founder's merge decision.** 14/14 checks pass on `54e5344d`, 0
   unresolved threads, `mergeStateStatus: CLEAN`. Nothing agent-owned blocks it. Merge is
   founder-only because `main` deploys to production on push.
2. Refresh the stale main checkout before working in it (§5).
3. The highest-value follow-up is BACKLOG #30 — wire `check:live-catalogue` into CI. It is the
   only guard that sees the 54% of the catalogue no source scan can reach, it needs no
   credentials, and today it runs only when a human types it.

**Do not redo**

- The seven bypass fixes. Each is pinned by a test proven to fail without it, and the reviewer
  independently mutated the numeric decoder, the invisible stripping, the slug parsing, the
  timeout and the JSON guard, confirming every mutation turns the suite red.
- The reviewer-substrate search. Use `cursor-agent --model gpt-5.5-high`.
- The three CodeRabbit threads. Replied with fix SHAs and resolved; 0 unresolved remain.

**First command to run**

```bash
cd "/Volumes/Storage Unit/CARSI" && git pull --ff-only
```

---

## 9. Risk notes

- **CI is now observed green** (14/14 on `54e5344d`) — the earlier draft of this handoff recorded
  it as pending, and it was confirmed afterwards rather than assumed. "Pushed with a receipt" is
  not "CI green"; both now hold, and each was read from `gh pr checks`.
- **Merging still deploys to production.** `CLEAN` means the gates are satisfied, not that the
  change is risk-free. The guard is additive — a new script plus tests, no product code path —
  but the merge itself publishes `main`.
- **The `AAA-S` rung is earned for the gate half, not the production half.** Rung A — the gate
  watched failing on the live defect — holds seven times over, each red-observed. But
  `prod-observed-by` is not discharged: the guard's fixes are proven against fixtures and against
  the *current* production catalogue, and no new live violation has been caught by them in the
  wild. Claim it as `AAA-S(gate='npm run test:live-catalogue', red-observed=<the 7 commits>,
  prod-observed-by=PENDING)` — an unqualified "AAA" would be `[UNCONFIRMED]` under the estate's
  own grammar.
- **Four courses are in breach on carsi.com.au right now** — `CCT-aligned`, `WRT`,
  `FSRT-aligned`, `ASD-aligned`. This session did not change that; 3 need prod-DB access.
- **Repo seed holds 37 courses; production sells 80.** Every source-scanning guard's green is
  scoped to the 46% in the repo. This guard sees the rest and is still not in CI (BACKLOG #30).
- **One `npm run test:unit` run flaked** at 141 files / 1054 tests with "1 error" while a second
  vitest process ran concurrently; five later runs were clean at 142/1056. If it recurs without
  concurrency, it is a real finding.
- **CLC-P2-006 is a deliberate hole.** Exotic HTML5 named entities (`&AMPWRT`, `&Wopf;RT`) are
  not decoded. The trade — a ~2,231-entry table or a parser dependency in the one guard that must
  run with zero install — is recorded in BACKLOG.md with a revisit trigger.

---

## 10. Handoff quality check

Every exit code in §6 came from a command run this session, and all seven were re-run by the
release-gate recorder against the exact pushed SHA. The push was verified with `git ls-remote`,
not inferred from local refs — the specific error the previous session made and recorded. The
seven fixes are each backed by an observed RED run, not a test written afterwards to pass. CI's
pending state is stated as pending in §5 and §9 rather than rounded up to green, and the `AAA`
claim is qualified rather than asserted. Nothing was merged, no production was mutated, no branch
deleted.

**Handoff complete. Next safe action: `git pull --ff-only` in the main checkout to clear the
stale branch; #674 is green, CLEAN, and awaiting only the founder's merge decision.**
