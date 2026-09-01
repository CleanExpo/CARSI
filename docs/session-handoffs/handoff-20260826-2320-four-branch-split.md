# Session handoff — CARSI, 26 August 2026 (evening)

Worktree: `D:\CARSI\.claude\worktrees\carsi-demo-day-prep-d088d2`
Branch at handoff: `docs/carsi-session-260826`
Phase 0 log: `.handoff-logs/handoff-20260826-2320.log`

---

## 1. Summary

**State: READY-TO-SHIP on four branches — and the ship path is blocked by B1.** The day's work
is complete, green and split into four independently reviewable branches cut from `origin/main`.
None can be pushed: the release gate requires an independent cross-vendor reviewer, and Codex is
rate-limited until **31/08/2026 11:13**, verified this session rather than carried over.

**Definition of Done: 4 of 5.** Tasks done or deferred with owners; gates ran green with the log
cited; `git status` clean. Item 4 fails by design — the work is not PR'd and cannot be, which is
B1, not an oversight. Item 3 has the same technicality as this morning: `git stash list` is **not
empty**, and it is still not this session's (see §9).

**Started as** a `/resume-from-handoff` of the morning session (BACKLOG row 10) and became a full
day: proof-pack, recert, courses, a 316-file docs audit, the roadshow money path end to end, and
finally a four-way branch split.

| Outcome | Detail |
|---|---|
| Completed | Rows 10 and 11; two new courses; markdown audit + plan archiving; model registry; roadshow pay-to-play (hold → Stripe → webhook); four-branch split; omnibus archived |
| Partial | Row 11's email-capture half — blocked on a founder pricing decision, see §7 |
| Not touched | BACKLOG rows 12, 14, 17, 19, 21, 23, 24, 26, 27 |
| Blocked | All four branches (B1). Subscription flip and secret sealing are founder-only |

---

## 2. Where it started

`/resume-from-handoff` against `handoff-20260826-2015-carsi-day-run.md`. Verdict was MATCH; the
tree was exactly as described and the handoff's own first command re-ran green (154 files / 1266
tests). The instruction was to take BACKLOG row 10, and the session then followed founder
redirection through courses, pricing, the money path and the branch split.

---

## 3. Decisions locked, and what shipped

**Nothing shipped. All work is local and unpushed** on four branches plus one archive.

Founder decisions locked this session:

- **$149 per seat, every location**, for the two-day carpet cleaning course.
- **Free entry is retired.** "We just offered this to see if there was a market" — the market
  test worked, so it ends rather than pauses.
- **Brisbane moves to Friday 4 – Saturday 5 September 2026.**
- **The subscription flip is decided** (DECISIONS #2) and awaits execution only.
- **Seal the DO secrets before turning payments on.**

Decisions I made under the decision-rights matrix:

- Hold expiry is **72 hours**, not a fixed calendar date, so it does not silently stop working
  after one event.
- A lapsed hold is **never** auto-confirmed on late payment; refunding one payer beats overselling
  the room.
- The omnibus branch was **renamed, not deleted** — 46 unpushed commits with no other copy.
- The docs branch was built as a **path-restricted diff**, not a cherry-pick of ~22 interleaved
  commits that all touch `BACKLOG.md`.

---

## 4. The four branches (all cut from `origin/main` @ `8bf398c5`)

| Branch | Commits | Scope | Standalone gate |
|---|---|---|---|
| `docs/carsi-session-260826` | 3 | 40 files, +2,308 / −44 — markdown audit, plan archiving, SPEC.md, ENGINE.md, DECISIONS #2, runbooks, campaign briefs | green; `test:unit` **151 / 1233**, identical to `origin/main` |
| `fix/carsi-guards-metrics-proofpack` | 1 | 24 files, +2,008 / −150 — licence guards, hook wiring, RWR metric, proof-pack Unicode, recert visibility, model registry | green; **159 / 1315**. `check:iicrc-terminology` exits 1 — see §9 |
| `feat/carsi-leather-and-ai-courses` | 2 | 2 files, +8,110 / −7,730 — the two one-day courses | green; **151 / 1233**; all 8 licence guards exit 0 |
| `feat/ccw-roadshow-pay-to-play` | 7 | 14 files, +2,982 / −1,863 — Brisbane dates, $149, free-entry retirement, seat holds, Stripe checkout, webhook | green; **155 / 1285** |
| `archive/carsi-omnibus-260826-superseded` | 46 | Superset of all four. **Do not merge.** | n/a |

---

## 5. Running state

**No process is running.** No dev server, no background job, no scheduled task armed by this
session.

---

## 6. Verification — exact commands

Run from the worktree root. Results below are from this session, logged to
`.handoff-logs/handoff-20260826-2320.log`.

```bash
npm run type-check && npm run lint && npm run test:unit && npm run build
```

On `docs/carsi-session-260826`, **16 of 16 applicable gates exit 0**: `type-check`, `lint`,
`test:unit`, `build`, `check:secrets --all`, `check:iicrc-terminology`, `check:iicrc-compliance`,
`test:iicrc-terminology`, `test:iicrc-compliance`, `check:cec`, `check:cec-surfaces`,
`check:au-english`, `check:standards-claims`, `check:designations`, `check:sources`,
`check:course-completeness`.

`check:hooks` exits 1 on this branch and is **not a failure**: the output is `Missing script:
"check:hooks"`. It is declared in `package.json`, which lives on the code branch by design —
`git show docs/…:package.json | grep -c "check:hooks"` returns **0**, and the same against the code
branch returns **1**. The split working, not a defect.

Prove nothing was lost when the omnibus was archived:

```bash
bash <scratchpad>/prove-preserved.sh
```

It self-tests first, then compares every path the omnibus changed against all four splits by blob
hash. Result this session: `SELFTEST ok`, then **covered=80 stranded=0**.

---

## 7. Deferred and open questions

### Deferred work

| Item | Owner | Blocking | Why |
|---|---|---|---|
| Push 4 branches, open PRs | Founder | **Yes — B1** | Reviewer unavailable until 31/08 11:13 |
| Rotate + seal the DO secrets | Founder | Yes for payments | Live `sk_live_` key plaintext in the app spec; runbook at `docs/runbooks/seal-do-app-secrets.md` |
| Create Stripe Price + flip `SUBSCRIPTIONS_ENABLED` | Founder | Yes | Money configuration; DECISIONS #2 decided, unexecuted |
| Flip `ROADSHOW_PAYMENT_REQUIRED=true` | Founder | Yes | Turns on pay-to-play; do it after sealing |
| Move the Google Calendar event to 4–5 Sept | Founder | No | Stored id is still the 11–12 Aug event; registrants get the wrong dates |
| Delete `carsi-dayrun-delete-me-260826@example.com` | Founder | No | Carried from the morning handoff, still outstanding |
| Resolve the CCW free-entry partnership term | Founder | No | Code now says $149 everywhere; CCW may have promised its customers otherwise |
| Row 11's email-capture half | Founder | Yes | Needs a free course to capture from; all 37 catalogue courses are `isFree: false` |
| BACKLOG rows 12, 14, 17, 19, 21, 23, 24, 26, 27 | Next agent | No | Untouched |

### Open questions

| Question | Owner | Blocking | Why |
|---|---|---|---|
| Have recert reminder emails actually been reaching learners? | Founder | No | `MAILTRAP_API_KEY` **is** set in production, so the transport works. Whether sends landed is still unmeasured — `ac22f241` makes the next run report it |
| Do Melbourne and Sydney get new dates, or retire? | Founder | No | Both finished (22–23 and 30–31 July) and are still listed and bookable. Dates were **not** invented; a test pins the expired set exactly |
| Does `deploy_on_push` undo DO secret sealing? | Founder | No | `app.yaml` declares 24 keys with `type: SECRET` on none. Untested deliberately — not a theory to try on production |

---

## 8. Pick up here

**Start here**

1. Read `BACKLOG.md` — the queued-blocker section at the top of Discoveries carries B1, the
   four-branch split records, and the merge order.
2. Do **not** work from `archive/carsi-omnibus-260826-superseded`. It is a superset; merging it
   undoes the split.
3. If it is on/after 31/08 11:13, the reviewer is back — run the release gate per branch in the
   merge order below.

**Merge order (only the first pair is ordered):**

`docs/carsi-session-260826` → `fix/carsi-guards-metrics-proofpack` →
`feat/carsi-leather-and-ai-courses` / `feat/ccw-roadshow-pay-to-play`

Docs must go first. The code branch hardens `check-iicrc-terminology`, which then catches **nine
real violations already on `origin/main`** (`git show
origin/main:docs/marketing/association-partnerships.md | grep -c "CEC-approved"` → **5**; same
against the docs branch → **0**). Merging code first turns CI red on `main` for a defect it merely
exposes.

**Do not redo**

- Do not retry the push before 31/08. Verified blocked two ways this session.
- Do not re-audit the markdown corpus, the model registry, or rows 10/11 — all measured today.
- Do not "fix" `check:hooks` on the docs branch. It is a missing script by design.
- Do not touch the stash. It is not this session's.
- Do not invent dates for Melbourne or Sydney.

**First command to run**

```bash
npm run type-check && npm run test:unit
```

---

## 9. Risk notes

**The stash is still not empty.** `stash@{0}: On fix/gp-452-react-hooks-real: wip-autogit-config`.
Not from this session, on another branch, and the stack is shared across worktrees. Left alone
deliberately, as this morning.

**A live Stripe key is readable in plaintext.** `doctl apps spec get` on `monkfish-app` returns
env vars unencrypted, including `sk_live_…` and the Mailtrap key — 43 of 44, only `CRON_SECRET`
sealed. Nothing was echoed, copied or committed; `check:secrets --all` exits 0 on every branch.
This is the highest-value outstanding risk and it gates the revenue work.

**I was wrong once today and it matters for the next agent.** I reported the subscription flip as
impossible because `printenv` showed no credentials. `doctl` **is** installed and authenticated.
`ENGINE.md` now records this — check `doctl` before asserting a credential blocker.

**`check:iicrc-terminology` exits 1 on the code branch.** True positive, not a regression: it
catches violations already on `main`. Clears when the docs branch lands first.

**Unverified assumptions, stated as such**

- The Stripe checkout path has never run against a live account. Pay-to-play is dark behind
  `ROADSHOW_PAYMENT_REQUIRED`, which defaults off; the first real run needs watching.
- The webhook's seat confirmation is unit-tested with Prisma mocked. The live DB read is unproven.
- Neither new course has been validated with a buyer. $275 and $220 are founder-set, not tested.

---

## 10. Handoff quality check

| Rule | Result |
|---|---|
| Tests claimed only if run | Yes — 16 gates, log path cited |
| Nothing claimed shipped | Correct — nothing pushed; four local branches |
| No process claimed running | Correct — none |
| Completed vs deferred separated | Yes — §1 and §7 |
| First command provided | Yes — §8 |
| Known-red gates disclosed | Yes — `check:hooks` (missing script) and `check:iicrc-terminology` (true positive), both with cause |
| Destructive action justified | Yes — omnibus renamed not deleted, preservation proven 80/0 before the rename |

**Handoff complete. Next safe action:** run `npm run type-check && npm run test:unit` to confirm
the tree, then wait for 31/08 11:13 and release the four branches in the stated merge order —
docs first, because the code branch's hardened guard is already correct about `main`.
