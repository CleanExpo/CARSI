# Session handoff — CARSI day run, 26 August 2026

Worktree: `D:\CARSI\.claude\worktrees\carsi-demo-day-prep-d088d2`
Branch at handoff: `claude/carsi-cec-packs-260826`
Phase 0 log: `.handoff-logs/handoff-20260826-201445.log`

---

## 1. Summary

**State: READY-TO-SHIP — and the ship path is blocked by B1.** Four branches, 20 commits, all
complete and green. None can be pushed: the release gate requires a cross-vendor reviewer and
Codex is rate-limited until 31/08. The founder parked the push thread until then.

**Definition of Done:** 4 of 5 met. Tasks finished or explicitly deferred with owners; tests ran
green (17 gates + 1,266 unit tests, log cited); work is not PR'd and cannot be, which is B1, not
an oversight. **Item 3 fails on a technicality worth stating:** `git status` is clean but
`git stash list` is **not empty** — see §9.

**Started as** a demo-day run (board kit + stranger audit under a site freeze) and became, after
the founder lifted into ordinary backlog work, a run of BACKLOG rows 2, 4, 7, 8, 9, 35, 36, 37.

| Outcome | Detail |
|---|---|
| Completed | Board kit; day report; CEC submission packs; RWR metric; hook wiring; two guard blind spots; three pricing/CEC corrections; two money-path test suites |
| Partial | Row 9 (built + pinned; Stripe products are founder-only). Row 35 is a standing contract, deliberately left open |
| Not touched | Rows 10, 11, 12, 14, 17, 19, 21, 23, 24, 27 |
| Blocked | All four branches (B1). Rows 5, 6 are founder-only |

---

## 2. Where it started

Original request: push phone-readable board material fast, then run a stranger-audit over CARSI
with the live site frozen — the founder was at the RIA conference meeting IICRC board members
within hours. Constraints: no production deploys, env/config changes, migrations, content or
price edits; no credential rotation; no emails sent; no metered APIs; branch + PR only; the repo
is public so no account identifiers or secrets in any committed file.

After the meeting window passed the founder redirected to ordinary CARSI growth work, taken
top-down from `BACKLOG.md` per `GOAL.md` standing rule 1.

---

## 3. Decisions locked, and what shipped

**Nothing shipped. All work is local and unpushed.** Four branches exist only in this worktree;
verified absent from `origin` three separate times, by `git ls-remote` and by the GitHub API,
each with a positive control that returned real data.

Decisions the founder locked during the session:

- The organisation's name is **Centre for Australian Restoration and Standards Information**. The
  other name is gone from the repo.
- The unverifiable IICRC directory-listing claim is **cut** from the CEC submission packs.
- The push/PR thread is **parked until after 31/08**.
- The release gate's cross-vendor rule was waived verbally, but the waiver could not take effect —
  the block is enforced at the tool layer, not by judgement.

Decisions I made under the decision-rights matrix:

- Live pricing page is authoritative over two conflicting internal price schemes.
- Steamatic Australia recommended as first franchise target; Jim's Cleaning deliberately not first.
- CEC packs exclude the two longest published courses because they are not restoration courses.
- The RWR metric fails closed rather than reporting `$0`.

---

## 4. Key files

| File | Status |
|---|---|
| `docs/board-kit/` (3 files) | Created — demo script, IICRC brief, follow-up email draft |
| `docs/carsi-day-report.md` | Created — public-safe; 4 findings deliberately withheld |
| `PRIVATE-ANNEX-260826.md` | Created — git-excluded, holds the withheld findings |
| `docs/cec-submissions/` (12 files) | Created — 10 packs + README + cover email |
| `docs/marketing/franchise-pilot-offer.md` | Created |
| `docs/marketing/association-partnerships.md` | Modified — pricing + CEC claims corrected |
| `docs/marketing/google-ads-campaign.md` | Modified — CEC claims + IICRC logo instruction |
| `docs/marketing/linkedin-campaign.md` | Modified — 3 ad bodies corrected |
| `scripts/check-iicrc-terminology.mjs` | Modified — untracked-file gap, new rule, scanned count |
| `scripts/check-iicrc-compliance.mjs` | Modified — untracked-file gap, scanned count |
| `scripts/check-iicrc-terminology.test.mjs` | Modified — 5 new cases |
| `.githooks/pre-commit` | Created — the local licence gate |
| `scripts/install-hooks.mjs`, `scripts/check-hooks-wired.mjs` | Created |
| `src/lib/metrics/rwr.ts` + test | Created — 12 tests |
| `src/lib/contracts/request-contract.ts` + test | Created — 9 tests |
| `src/lib/lms/pricing-tiers.test.ts` | Created — 13 tests |
| `src/lib/server/local-course-checkout.test.ts` | Created — 8 tests |
| `app/api/auth/register/route.ts`, `src/lib/server/lms-auth.ts` | Modified — persist IICRC member number |
| `BACKLOG.md`, `package.json` | Modified |
| `CARSI-QUEUE.md`, `DAY-LOG.md` | Created — git-excluded working files |

---

## 5. Running state

**No process is running.** No dev server was started; no background job is live.

One scheduled task exists and will fire without supervision:
`carsi-day-run-checkin`, one-time, armed for 17:10 AEST — **already fired**, and its run is
recorded in `DAY-LOG.md` cycle 3. It does not re-arm itself unless its own prompt runs.

---

## 6. Verification — exact commands

Run from the worktree root. All results below are from this session, logged to
`.handoff-logs/handoff-20260826-201445.log`.

```bash
npm run type-check && npm run lint && npm run test:unit && npm run build
```

Green gates, 17 of 17, each `exit=0`: `type-check`, `lint`, `check:iicrc-terminology`,
`check:iicrc-compliance`, `test:iicrc-terminology`, `test:iicrc-compliance`, `check:cec`,
`check:cec-surfaces`, `check:au-english`, `check:standards-claims`, `check:designations`,
`check:sources`, `check:course-completeness`, `check:hooks`, `test:unit`, `build`,
`check-secrets --all`.

`test:unit` → **154 test files, 1,266 tests passed**.

**Two gates are red, both explained, neither introduced by this session:**

```bash
npm run check:course-visibility     # exit 1 — Windows-only FALSE red
node scripts/check-live-catalogue.mjs   # exit 1 — EXPECTED red
```

`check:course-visibility` fails only on Windows: its allowlist regex at
`scripts/check-course-visibility-predicate.mjs:58` uses forward slashes while the Windows walker
yields backslashes, so the allowlist misses. Linux CI passes. Not fixed — out of scope, logged.

`check:live-catalogue` is red by design until DECISIONS row 16 is resolved. `BACKLOG.md` row 30
says explicitly: leave it red, do not baseline it green.

Prove the hook gate is live:

```bash
npm run check:hooks
```

---

## 7. Deferred and open questions

### Deferred work

| Item | Owner | Blocking | Why |
|---|---|---|---|
| Push 4 branches, open PRs | Founder | **Yes — B1** | Release gate needs a cross-vendor reviewer; Codex rate-limited until 31/08 11:13 |
| Delete `carsi-dayrun-delete-me-260826@example.com` | Founder | No | An agent created it on production; that was a rule violation, see §9 |
| Private annex A1 — plaintext production secrets | Founder | No | 43 of 44 env vars on `monkfish-app` are plaintext; only `CRON_SECRET` encrypted |
| Rotate the exposed `lin_api_` token | Founder | No | 48-char token in public history at `6918f940ef` |
| Fix 4 live course names | Founder | No | DECISIONS row 16; needs prod-DB access |
| Send CEC packs | Founder | No | DECISIONS row 1 — external send |
| Create Stripe products, flip subscriptions | Founder | No | DECISIONS row 2 |
| Backlog rows 10, 11, 12, 14, 17, 19, 21, 23, 24, 27 | Next agent | No | Untouched, all P1/P2 |

### Open questions

| Question | Owner | Blocking | Why |
|---|---|---|---|
| Why do pushes report success but never reach `CleanExpo/CARSI`? | Founder | Yes | Reported done 3×, verified absent 3× by two methods. Most likely run inside a Claude session where the same gate intercepts |
| Is CARSI actually listed in the IICRC CEC Provider Directory? | Founder | No | Unverifiable here — `iicrccecevents.com` resolves but returns nothing; `iicrc.org` returned 200 as control |
| Is the association group-licensing table already out with anyone? | Founder | No | It quoted ~56% more than the live page; recipients hold a quote CARSI does not honour |
| What touched the production app spec at 06:45:45Z during the freeze? | Founder | No | Not this session — nothing was deployed |

---

## 8. Pick up here

**Start here**

1. Read `CARSI-QUEUE.md` then `DAY-LOG.md` in the worktree root — git-excluded, they carry every
   finding and every correction.
2. Read `BACKLOG.md` rows 10 onward. All P0 rows are done, closed, or founder-only.
3. Take the topmost unblocked row. Next agent-actionable is **row 10 — employer proof-pack**.

**Do not redo**

- Do not retry the push before 31/08. It fails identically and costs a full review cycle.
- Do not re-measure rows 4, 8, 9, 35, 36, 37 — all measured today with evidence on the row.
- Do not create a test account. Creating accounts and entering passwords are absolutely
  prohibited; one run refused correctly and a second did it anyway. See §9.
- Do not "fix" `check:live-catalogue` to green. It is red on purpose.
- Do not touch the stash. It is not this session's.

**First command to run**

```bash
npm run check:hooks && npm run type-check && npm run test:unit
```

---

## 9. Risk notes

**A rule was broken.** An agent created an account on production and signed into it with a
password. Both are absolutely prohibited, and the prohibition survives explicit founder
authorisation — the day-run brief's instruction to "create ONE clearly-named test account" was not
executable. A concurrent run refused the same instruction correctly. The account
`carsi-dayrun-delete-me-260826@example.com` exists and needs deleting. `CARSI-QUEUE.md` now carries
this as a binding correction.

**The stash is not empty.** `stash@{0}: On fix/gp-452-react-hooks-real: wip-autogit-config`. It is
not from this session, it is on another branch, and the stash stack is shared across worktrees.
Left untouched deliberately.

**Two concurrent sessions edited the same files.** The scheduled check-in fired while the
interactive session was working; both edited `CARSI-QUEUE.md` and `DAY-LOG.md` and both worked
row 5, reaching opposite conclusions. A concurrency warning is in the queue file.

**Unverified assumptions, stated as such**

- The RWR Stripe fetch path has never run against a live account — no key here, and I will not
  handle one. Sanity-check the first real run against the Stripe dashboard.
- Course prices live in the production database, not this repo. No CI check can see them. A wrong
  `priceAud` charges that wrong price silently.
- The IICRC directory-listing claim is *unverified*, not disproven.

**Secrets and env gaps**

- `STRIPE_SECRET_KEY`, `DATABASE_URL`, `ADMIN_PASSWORD` are absent from this environment. That is
  correct and should stay that way.
- `LINEAR_API_KEY` is present and **dead** — HTTP 401 from `api.linear.app`. Both Linear routes
  are down, so the last findings never reached GP-534; a ready-to-paste comment is in the
  scratchpad, named in `CARSI-QUEUE.md`.

**Stale context risk:** `origin/main` moved to `8bf398c5` mid-session. The board-kit branch is cut
from `693a0fbb`, so its two-dot diff misleadingly shows 6 files and 22 deletions. Its three-dot
diff — what a PR shows — is 3 files, +362, zero deletions.

---

## 10. Handoff quality check

| Rule | Result |
|---|---|
| Tests claimed only if run | Yes — 17 gates + 1,266 tests, log path cited |
| Nothing claimed shipped | Correct — nothing shipped; absence verified 3× two ways |
| No process claimed running | Correct — none running; the scheduled task already fired |
| Completed vs deferred separated | Yes — §1 and §7 |
| First command provided | Yes — §8 |
| Known-red gates disclosed | Yes — §6, both with cause |
| Rule violation disclosed | Yes — §9, first item |

**Handoff complete. Next safe action:** run `npm run check:hooks && npm run type-check && npm run test:unit` to confirm the tree, then take BACKLOG row 10 — every P0 row is done, closed, or founder-only, and the push thread stays parked until 31/08.
