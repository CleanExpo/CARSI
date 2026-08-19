# Session Handoff — #674's three review findings drained, plus four more the reviewer found

**Timestamp:** 2026-08-19 21:14 AEST
**Machine:** `Phills-Mac-mini.local`
**Repo:** CARSI — worktree `/Volumes/Storage Unit/CARSI/.claude/worktrees/fix-674-review-findings`
**Branch:** `fix/674-review-findings` @ `27848c1f` — **local only, 0 pushed**, tree clean, stash empty
**Scope:** founder ask — "clear all old completed works by pushing and committing, ensure the work
is at a AAA rating, clean and clear data to work with"

---

## 1. Summary

**State: WIP-BLOCKED.** The work is complete and green; it is **not pushed**, and the push is
blocked by the release gate for a legitimate reason (§7).

**Definition-of-Done:** 1 partial (the code work is done; the *push* half of the founder's ask is
not) · 2 **yes** (all gates run green this session, cited §6) · 3 **yes** (tree clean, stash
empty) · 4 **NO** (nothing pushed, no receipt) · 5 **yes** (the guard's behaviour change is
demonstrated end to end on a live production audit, §6). Any "no" forbids SHIPPED.

Seven real licence bypasses were closed this session, each **watched failing before being
fixed**. Three were the CodeRabbit findings blocking #674; four more were found by the
independent reviewer across three rounds.

---

## 2. Where it started

The founder asked to clear completed work by committing and pushing, at a AAA rating, and to
leave clean data to work with. The repo state at start: one open PR (#674, all 14 CI checks
green) merge-blocked on three unresolved CodeRabbit threads, one untracked handoff doc, two
local-only branches, two prunable worktrees, and local `main` 4 commits behind.

---

## 3. Decisions locked + what shipped

**Nothing shipped. All work is local to this worktree on `fix/674-review-findings`.**

Housekeeping done in the main checkout: 2 stale worktrees pruned, local `main` fast-forwarded to
`86165d5e`.

**Decisions locked:**

- **The independent reviewer is `cursor-agent --model gpt-5.5-high`**, not Codex and not
  OpenRouter, on this machine today. Codex is credit-exhausted until 2026-08-20 13:33; the
  OpenRouter route needs `OPENROUTER_API_KEY`, which the harness classifier blocks this session
  from sourcing (§7). `cursor-agent` is gate option 2 — a different vendor's subscription
  reviewer, no metered spend. It is logged in as `support@carsi.com.au`.
- **Hand-rolled parsers lose.** Three consecutive rounds beat one: a hand-listed invisible
  character class missed U+034F/U+061C; hand-rolled URL tail-splitting missed a query string,
  then a percent-encoded slug, then a dot segment. Both are now delegated to the runtime —
  `\p{Default_Ignorable_Code_Point}` and WHATWG `URL`. Prefer the audited implementation over
  an enumeration; enumerations ratchet forever.
- **A positive control is worth more than a verdict.** Running the reviewer against the *pre-fix*
  code proved it can FAIL *and* surfaced three further bypasses in the same run. That control is
  what makes every PASS in this session evidence rather than silence.

---

## 4. Key files

| File | Status |
|---|---|
| `scripts/check-live-catalogue.mjs` | Modified — 7 bypasses closed; `decodeEntities`, `slugOf`, `parseFetchTimeout`, `cannotAuditReport` added/exported |
| `scripts/check-live-catalogue.test.mjs` | Modified — 129 → 157 checks; fixture gained a `sitemapPaths` override |
| `BACKLOG.md` | Modified — CLC-P2-005 filed |
| `docs/session-handoffs/handoff-20260819-175333-*.md` | Created (committed `92be1290`; was untracked at session start) |
| `docs/session-handoffs/handoff-20260819-211443-*.md` | Created — this file |
| `/Users/phill-mac/.claude/jobs/f37f7054/tmp/review-*/reviewer-report.json` | Reviewer-authored, SHA-bound; **not** in the repo |

---

## 5. Running state

- **One background review is still running** at handoff time: round 4, task `bh04qxo1u`, bound to
  `27848c1f`. Its report will land at
  `/Users/phill-mac/.claude/jobs/f37f7054/tmp/review-r4/reviewer-report.json`. Rounds 2 and 3 both
  returned FAIL and both were drained; round 4's verdict is **not known** and must not be assumed.
- Review worktrees exist at `~/.claude/jobs/f37f7054/tmp/review-{wt,final,r3,r4}` with
  `node_modules` and `src/generated` symlinked from the main checkout. `git worktree prune` after
  deleting them.
- This worktree has `node_modules` symlinked and `src/generated/prisma` generated locally.
  `node_modules` is excluded via `.git/info/exclude` (the `.gitignore` rule has a trailing slash
  and does not match a symlink).

---

## 6. Verification — exact commands

All run this session in this worktree, on `27848c1f` unless noted.

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

**`npm run type-check` needs `npx prisma generate` first** in a fresh worktree. Without it, it
exits 2 with `Cannot find module '@/generated/prisma/client'` plus a cascade of TS7006
implicit-any errors — an environment gap, not a defect. That cost time this session; it is
recorded so the next agent does not re-diagnose it.

**Every one of the seven fixes was watched RED first.** Not "tests added" — the real guard was
run against a planted input and observed exiting 0 (or hanging, or emitting empty stdout) before
the fix, then 1 after.

**The production audit is the real-world control for false positives.** It reached 80/80 URLs and
reported the same 4 violations before and after every widening (entity decoding, invisible
stripping, URL normalisation) — so none of them raised a false positive across the 76 clean live
titles.

---

## 7. Deferred + open questions

**Blocking the founder's "push" ask (agent-owned, but gated)**

| Item | Blocking |
|---|---|
| **No PR release-gate receipt exists.** The gate's pre-push hook correctly refuses every `git push` without one — including the archival pushes below. Issuing it needs step 6 of `pr-release-gate` with a reviewer report bound to the exact final HEAD. | Round 4's verdict. If it FAILs, drain and re-review; if it PASSes on `27848c1f`, issue the receipt and push. |
| Archive-push `fix/vacuous-cli-guards` (4 commits) and `worktree-overnight-gate0-20260818` (19 commits, incl. BACKLOG #2 CEC packs) | Same receipt gate. Both are local-only; the overnight branch holds committed work that exists nowhere else. Branch *deletes* remain founder-owned. |
| Resolve the three CodeRabbit threads on #674 | The push. All three findings are fixed; the threads need a reply naming the fix SHA. |

**Deferred (agent-owned, unblocked)**

| Item | Blocking |
|---|---|
| BACKLOG #30 — wire `check:live-catalogue` into CI | Nothing. Still the only guard that sees production, still runs only when a human types it. |
| BACKLOG #33 — add `tsx` to devDependencies | Nothing. |
| BACKLOG #36 — `bootstrap.sh` must install the pre-push hook | Nothing. |
| CLC-P2-004, CLC-P2-005 | Filed, accepted, not fixed — reasoning in BACKLOG.md. Do not silently "fix" either without the ruling each names. |

**Open questions (founder-owned)**

| Question | Why |
|---|---|
| **Merge #674** | `main` deploys to production on push. Merge is founder-only. |
| **DECISIONS #16 — prod-DB access** | 4 courses carry banned IICRC branding live *right now*; 3 of the 4 are absent from repo seed, so no agent can reach them. Licence-critical, unchanged by this session. |
| DECISIONS #1 / #3 — CEC packs, outreach emails | Deadlines were 2026-08-20; now past. |

---

## 8. Pick up here

**Start here**

1. Read round 4's report at `~/.claude/jobs/f37f7054/tmp/review-r4/reviewer-report.json`. If the
   task is still running, `TaskOutput` on `bh04qxo1u`. **Do not assume PASS.**
2. If FAIL with a P0/P1: reproduce it red, fix it, re-run §6, commit, and re-review the NEW SHA —
   a PASS bound to an older SHA is invalid. Apply the stopping rule: on this already-hardened
   guard, a further exotic encoding of an already-drained class is a P2 to file, not a blocker.
3. If PASS: issue the receipt, then push and drain the threads.

```bash
python3 ~/.claude/skills/pr-release-gate/scripts/pr_release_gate.py issue \
  --primary-agent claude \
  --review-report /Users/phill-mac/.claude/jobs/f37f7054/tmp/review-r4/reviewer-report.json \
  --test 'npm run type-check' \
  --test 'npm run test:unit' \
  --test 'npm run test:live-catalogue'
```

Then push into the **existing** branch — one head, no replacement PR:
`git push origin HEAD:guard/live-catalogue-licence`

**Do not redo**

- The seven bypass fixes. All are pinned by tests proven to fail without them, and the reviewer
  independently mutated the numeric decoder, the invisible stripping, the slug decoding, the
  timeout and the JSON guard, confirming each mutation turns the suite red.
- The reviewer-substrate search. Codex is credit-exhausted until 2026-08-20 13:33; use
  `cursor-agent --model gpt-5.5-high`.
- The positive control. Already run against pre-fix code; the reviewer returned FAIL and named
  the numeric-entity bypass.

**First command to run**

```bash
cd "/Volumes/Storage Unit/CARSI/.claude/worktrees/fix-674-review-findings" && npm run type-check && npm run test:live-catalogue
```

---

## 9. Risk notes

- **Nothing is pushed.** 30 commits ahead of `origin/main`, 4 of them written this session, all
  living in one worktree on one machine. This is the single biggest risk in this handoff, and it
  is exactly the failure the founder's ask was aimed at. The receipt gate is why, not neglect.
- **Round 4's verdict is unknown at handoff time.** Any claim that this branch has a clean
  independent review is unsupported until that report is read. Rounds 2 and 3 both FAILed.
- **One `npm run test:unit` run flaked** at 141 files / 1054 tests with "1 error" while a second
  vitest process ran concurrently. Three subsequent runs were clean at 142/1056. Recorded rather
  than buried; if it recurs without concurrency, it is a real finding.
- **Four courses are in breach on carsi.com.au right now** — `CCT-aligned`, `WRT`,
  `FSRT-aligned`, `ASD-aligned`. Unchanged by this session; 3 need prod-DB access.
- **Repo seed holds 37 courses; production sells 80.** Every "guards green" claim from a
  source-scanning guard is scoped to the 46% in the repo. This guard is the only one that sees
  the other 54%, and it is still not in CI (BACKLOG #30).
- **The claim grammar for this work is `AAA-S`, and it is not yet earned.** Rung A (gate watched
  failing on the live defect) IS satisfied — seven times, each red-observed. The rung is not
  claimable because `prod-observed-by` requires an agent that did not build it, and the
  independent verdict for the final SHA is still outstanding. An unqualified "AAA" here would be
  `[UNCONFIRMED]` by the estate's own rule.
- Repo-wide `npm run lint` exits 1 with ~14,777 pre-existing problems (BACKLOG #37). Attribution
  checked: the two changed files lint clean.

---

## 10. Handoff quality check

Every exit code in §6 came from a command run this session in this worktree. The seven fixes are
each backed by an observed RED run, not by a passing test written afterwards. `SHIPPED` was
withheld because nothing is pushed — the founder's ask is half-delivered, and saying so is more
useful than a green-looking summary. Round 4's unknown verdict is stated as unknown in §5 and §9
rather than presumed. One flaky test run is recorded in §9 instead of being dropped because the
reruns were convenient. Nothing was merged, no production was mutated, no branch deleted.

**Handoff complete. Next safe action: read round 4's report (`TaskOutput` on `bh04qxo1u`), and
either drain its findings or issue the receipt and push — never push without it.**
