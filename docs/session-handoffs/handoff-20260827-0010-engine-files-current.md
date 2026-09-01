# Session handoff — CARSI, 27 August 2026 00:10 AEST

Worktree: `D:\CARSI\.claude\worktrees\carsi-demo-day-prep-d088d2`
Branch at handoff: `docs/carsi-session-260826`
Phase 0 log: `.handoff-logs/handoff-20260827-0010.log`

**Supersedes** `handoff-20260826-2320-four-branch-split.md`, which is still accurate on the split
itself. This one adds the engine-file updates made after it and is the report to resume from.

---

## 1. Summary

**State: READY-TO-SHIP on four branches — ship path blocked by B1.** Everything is complete,
green and split into four independently reviewable branches cut from `origin/main`. None can be
pushed: the release gate requires an independent cross-vendor reviewer and Codex is rate-limited
until **31/08/2026 11:13**, verified this session two ways rather than carried over.

**Definition of Done: 4 of 5.** Tasks done or deferred with named owners; gates ran green with the
log cited; work is not PR'd and cannot be, which is B1 rather than an oversight. Item 3 fails on
the same technicality as the two prior handoffs: `git status` is clean but `git stash list` is
**not empty**, and the entry is still not this session's (§9).

**What this session added** after the 23:20 handoff: `GOAL.md` current state, five new
`DECISIONS.md` rows, and `BACKLOG.md` row statuses — the three engine files GOAL rule 6 requires
at session end.

| Outcome | Detail |
|---|---|
| Completed | BACKLOG rows 10 and 11; two courses; 316-file markdown audit + plan archiving; model registry; roadshow pay-to-play end to end; four-branch split; omnibus archived; all three engine files updated |
| Partial | Row 11's email-capture half — founder-gated (DECISIONS #21) |
| Not touched | BACKLOG rows 12, 14, 17, 19, 21, 23, 24, 26, 27 |
| Blocked | All four branches (B1); five founder decisions (DECISIONS #17–#21) |

---

## 2. Where it started

`/resume-from-handoff` against `handoff-20260826-2015-carsi-day-run.md`. Verdict MATCH — the tree
was exactly as described and the handoff's own first command re-ran green (154 files / 1266 tests).
The instruction was BACKLOG row 10; the session then followed founder redirection through courses,
pricing, the money path, a four-way branch split, and the engine-file close-out.

---

## 3. Decisions locked, and what shipped

**Nothing shipped. All work is local and unpushed** across four branches plus one archive.

Founder decisions locked:

- **$149 per seat, every location.** Free entry **retired** — "we just offered this to see if there
  was a market"; it worked, so it ends rather than pauses.
- **Brisbane moves to Friday 4 – Saturday 5 September 2026.**
- **The subscription flip is decided** (DECISIONS #2), awaiting execution only.
- **Seal the DO secrets before turning payments on.**

Mine, under the decision-rights matrix:

- Hold expiry is **72 hours**, not a fixed date, so it cannot silently stop working after one event.
- A lapsed hold is **never** auto-confirmed on late payment — refunding one payer beats overselling.
- The omnibus branch was **renamed, not deleted**: 46 unpushed commits with no other copy.
- The docs branch was built as a **path-restricted diff**, not a cherry-pick of ~22 interleaved
  commits that all touch `BACKLOG.md`.

---

## 4. Key files

| File | Status |
|---|---|
| `GOAL.md` | Modified — current state for 26/08; RWR ≈ $0 unchanged, blocker moved to plaintext secrets |
| `DECISIONS.md` | Modified — rows **17–21** added; #2 marked DECIDED |
| `BACKLOG.md` | Modified — header pointing at row 12; #26 unblocked, #4 decided, #13 carries a copy warning |
| `docs/session-handoffs/handoff-20260826-2320-four-branch-split.md` | Created — the split handoff |
| `docs/runbooks/seal-do-app-secrets.md` | Created — rotate, then seal, then flip |
| `src/lib/marketing/ccw-roadshow-payment.ts` + test | Created — seat holds (on the money branch) |
| `src/lib/server/ccw-roadshow-checkout.ts` + test | Created — Stripe checkout (money branch) |
| `src/lib/server/ccw-roadshow-confirm-payment.test.ts` | Created — webhook confirmation (money branch) |
| `data/seed/courses-catalog.json` | Modified — two new draft courses (courses branch) |
| `src/ai/model-registry/index.ts` + `model-currency.test.ts` | Modified/Created — Anthropic lineup reconciled (code branch) |
| `.handoff-logs/handoff-20260827-0010.log` | Created — this gate run |

## 4b. The four branches (all from `origin/main` @ `8bf398c5`)

| Branch | Commits | Scope | Standalone gate |
|---|---|---|---|
| `docs/carsi-session-260826` | 8 | docs, engine files, runbooks, briefs | **151 / 1233**, all 16 gates exit 0 |
| `fix/carsi-guards-metrics-proofpack` | 1 | 24 files — guards, hooks, RWR, proof-pack, recert, model registry | **159 / 1315**; `check:iicrc-terminology` exits 1 (§9) |
| `feat/carsi-leather-and-ai-courses` | 2 | 2 files — the two one-day courses | **151 / 1233**; all 8 licence guards exit 0 |
| `feat/ccw-roadshow-pay-to-play` | 7 | 14 files — dates, price, holds, Stripe, webhook | **155 / 1285** |
| `archive/carsi-omnibus-260826-superseded` | 46 | superset — **do not merge** | n/a |

---

## 5. Running state

**No process is running.** No dev server, no background job, no scheduled task armed by this
session.

---

## 6. Verification — exact commands

From the worktree root. Results below are this session's, logged to
`.handoff-logs/handoff-20260827-0010.log`.

```bash
npm run type-check && npm run lint && npm run test:unit && npm run build
```

**16 of 16 gates exit 0** on `docs/carsi-session-260826`: `type-check`, `lint`, `test:unit`
(**151 files / 1233 tests**), `build`, `check:secrets --all`, `check:iicrc-terminology`,
`check:iicrc-compliance`, `test:iicrc-terminology`, `test:iicrc-compliance`, `check:cec`,
`check:cec-surfaces`, `check:au-english`, `check:standards-claims`, `check:designations`,
`check:sources`, `check:course-completeness`.

`check:hooks` is **not run on this branch and that is correct** — it is declared in `package.json`,
which lives on the code branch by design. `git show docs/…:package.json | grep -c "check:hooks"`
returns **0**; the same against the code branch returns **1**.

Prove the archive lost nothing:

```bash
bash <scratchpad>/prove-preserved.sh   # SELFTEST ok, then covered=80 stranded=0
```

---

## 7. Deferred and open questions

### Deferred work

| Item | Owner | Blocking | Why |
|---|---|---|---|
| Push 4 branches, open PRs | Founder | **Yes — B1** | Reviewer capped until 31/08 11:13 |
| Rotate + seal DO secrets (DECISIONS #17) | Founder | Yes, for payments | Live `sk_live_` key plaintext; runbook written |
| Stripe Price + flip `SUBSCRIPTIONS_ENABLED` (#2) | Founder | Yes | Decided, unexecuted; sequence after #17 |
| Flip `ROADSHOW_PAYMENT_REQUIRED` (#20) | Founder | Yes | Brisbane is 4 Sept, so 1 Sept is the real deadline |
| Melbourne / Sydney dates or retire (#18) | Founder | No | Defaults to removing both listings on 29/08 |
| CCW free-entry partnership term (#19) | Founder | No | Code says $149 everywhere; CCW may have promised otherwise |
| Free course for row-11 capture (#21) | Founder | Yes | All 37 catalogue courses are `isFree: false` |
| Move the Google Calendar event to 4–5 Sept | Founder | No | Stored id is still the 11–12 Aug event |
| Delete `carsi-dayrun-delete-me-260826@example.com` | Founder | No | Carried from the morning handoff, still outstanding |
| BACKLOG rows 12, 14, 17, 19, 21, 23, 24, 26, 27 | Next agent | No | Untouched; **12 is the top** |

### Open questions

| Question | Owner | Blocking | Why |
|---|---|---|---|
| Have recert emails actually reached learners? | Founder | No | `MAILTRAP_API_KEY` **is** set in production, so the transport works; delivery is still unmeasured. `ac22f241` makes the next run report it |
| Does `deploy_on_push` undo DO secret sealing? | Founder | No | `app.yaml` declares 24 keys with `type: SECRET` on none. Untested deliberately — not a theory to try on production |
| Will either new course sell at $275 / $220? | Founder | No | Prices are founder-set; no buyer validation exists |

---

## 8. Pick up here

**Start here**

1. Read the `BACKLOG.md` header — it names the next row (**12**), the branch situation and the
   merge order.
2. Read the "queued push" block in Discoveries before building anything.
3. Do **not** work from `archive/carsi-omnibus-260826-superseded`.

**Merge order (only the first pair is ordered):**
`docs/carsi-session-260826` → `fix/carsi-guards-metrics-proofpack` →
`feat/carsi-leather-and-ai-courses` / `feat/ccw-roadshow-pay-to-play`

Docs first, because the code branch's hardened guard catches **nine real violations already on
`origin/main`** (`git show origin/main:docs/marketing/association-partnerships.md | grep -c
"CEC-approved"` → **5**; against the docs branch → **0**). Merging code first turns CI red on
`main` for a defect it merely exposes.

**Do not redo**

- Do not retry the push before 31/08 — verified blocked two ways.
- Do not re-audit the markdown corpus, the model registry, or rows 10/11.
- Do not "fix" `check:hooks` on the docs branch — it is a missing script by design.
- Do not touch the stash. Do not invent Melbourne or Sydney dates.
- Do not ship the campaign copy from `main` — it still carries the banned form.

**First command to run**

```bash
npm run type-check && npm run test:unit
```

---

## 9. Risk notes

**The stash is still not empty.** `stash@{0}: On fix/gp-452-react-hooks-real: wip-autogit-config`.
Not this session's, on another branch, and the stack is shared across worktrees. Left alone.

**A live Stripe key is readable in plaintext.** `doctl apps spec get` on `monkfish-app` returns env
vars unencrypted — 43 of 44, only `CRON_SECRET` sealed. Nothing was echoed, copied or committed;
`check:secrets --all` exits 0 on every branch. Highest-value outstanding risk; it gates the revenue
work and is DECISIONS #17.

**`check:iicrc-terminology` exits 1 on the code branch.** True positive, not a regression — it
catches violations already on `main`. Clears once the docs branch lands.

**I was wrong once, and it is recorded because the next agent needs it.** I reported the
subscription flip impossible after a `printenv` check found no credentials. `doctl` was
authenticated the whole time. `ENGINE.md` now says to check it before asserting a credential
blocker.

**Unverified assumptions**

- The Stripe checkout path has never run against a live account; pay-to-play is dark behind a flag
  defaulting off. Watch the first real run.
- The webhook's seat confirmation is unit-tested with Prisma mocked; the live DB read is unproven.
- Neither new course has been validated with a buyer.

---

## 10. Handoff quality check

| Rule | Result |
|---|---|
| Tests claimed only if run | Yes — 16 gates, 151 files / 1233 tests, log cited |
| Nothing claimed shipped | Correct — nothing pushed |
| No process claimed running | Correct — none |
| Completed vs deferred separated | Yes — §1 and §7 |
| First command provided | Yes — §8 |
| Known-red gates disclosed | Yes — `check:hooks` (missing script, by design) and `check:iicrc-terminology` (true positive), both with cause |
| Destructive action justified | Yes — omnibus renamed not deleted, preservation proven 80/0 first |
| Supersession stated | Yes — replaces the 23:20 handoff, which stays accurate on the split |

**Handoff complete. Next safe action:** run `npm run type-check && npm run test:unit` to confirm the
tree, then take BACKLOG row 12 — or, if it is on/after 31/08 11:13, release the four branches in
the stated merge order, docs first.
