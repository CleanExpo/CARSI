# Handoff — CARSI licence remediation: 120 violations drained, blocked on review evidence

**State: WIP-BLOCKED — INCOMPLETE.** Definition-of-Done is 4 of 5.
**Date:** 2026-08-07 ~15:56 local
**Branch:** `gauntlet/carsi-credential-landing` @ `23875663b44d5d43e7f5c5ab88fcc481f7c5f76f`
**Base:** `origin/main` @ `72fd7527` — **main has moved; a rebase is required** (see §9).
**Phase 0 log:** `.handoff-logs/handoff-20260807-1556.log`
**Supersedes:** `handoff-20260807-carsi-gauntlet-reviewer-unfit.md`

---

## 1. Summary

Drained two full rounds of Codex findings and merged two branches into one.

- **Completed:** 120 licence-critical violations → 0; three new guard rules; three content
  trees added to scan scope; two guard bypasses closed; a ReDoS fixed; the completeness
  scorecard given its first non-vacuity test; the intro-video workflow stopped swallowing
  its own failure; `fix/carsi-public-surface-iicrc-branding` folded in.
- **Partial:** none.
- **Not touched:** the remaining pre-existing whole-line-allow bypasses on the `IICRC CEC`
  and approved-school rules (§7).

**Definition-of-Done:** 1 ✅ · 2 ✅ (Phase 0 exit 0, log cited) · 3 ✅ (clean tree; the one
stash entry is `On main: DISCARD data-file churn 2026-07-13`, from `main`, not this
session's) · 4 ❌ **not pushed, no PR** · 5 ✅ (rendered output verified). **Any "no" forbids
SHIPPED**, so this is WIP-BLOCKED.

## 2. Where it started

Resumed from `handoff-20260807-carsi-gauntlet-awaiting-rereview.md`, which was blocked on
re-reviewing `3cb09b2b`. That review had already run and its P0 was fabricated. The founder
then authorised stripping every course-level CEC claim estate-wide, and merging the two
branches into one.

## 3. Decisions locked + what shipped

**Nothing shipped from this branch. All 40 commits are local; no push, no PR.**

Decisions:
- **Acronyms map to their literal subject matter, never to a CARSI designation.** WRT →
  water damage restoration, ASD → structural drying, etc. **CRT (Carpet Repair) and OCT
  (Odour Control) have no CARSI equivalent** — only nine designations exist — so mapping
  them would be fabrication.
- **CEC claims are removed, not reworded.** Fail-closed means absent.
  `data/seed/cec-approvals.json` holds **zero** approvals.
- **Exemptions are `neutralise`, never `allow`.** A whole-line allow lets a permitted
  construction launder a real claim beside it — this file was bitten by that three times.
- **One coherent branch, not two PRs** (CLAUDE.md: replacement PRs for one scope are a
  failure).

## 4. Key files

| File | Status |
|---|---|
| `scripts/check-iicrc-terminology.mjs` | Modified — 3 new rules, 3 scan dirs, ReDoS fix |
| `scripts/check-iicrc-terminology.test.mjs` | Modified — 27/24 → **29 block / 27 pass** |
| `scripts/check-course-completeness.mjs` | Modified — exported `scoreCourse`, added `isCli` |
| `scripts/check-course-completeness.test.mjs` | **Created** — 14 cases, 6 bars |
| `src/components/seo/JsonLd.tsx` | Modified — credential disclaimer no longer claims CEC eligibility |
| `src/lib/server/public-courses-list.ts` | Modified — predicate now agrees with Prisma |
| `.github/workflows/ci.yml` | Modified — non-advisory completeness self-test step |
| `.github/workflows/generate-course-intro-videos.yml` | Modified — `gh pr create` failure no longer swallowed |
| ~56 copy files across `app/ src/ docs/ data/ public/` | Modified — 120 violations drained |
| `reviewer-report-codex*.json` | Read-only — preserved in scratchpad, not committed |

## 5. Running state

No processes running. Codex round 3 was dispatched and **died on quota** — its wrapper
exited 0 while Codex printed `You've hit your usage limit … try again at Aug 8th, 2026
3:22 PM`, so no `reviewer-report-codex-r3.json` exists. **Exit 0 did not mean success.**

## 6. Verification (all from this session, log: `.handoff-logs/handoff-20260807-1556.log`)

```bash
npx tsc --noEmit          # 0
npm run lint              # 0
npm run test:unit         # 0 — 139 files / 1005 tests
npm run build             # 0 — 153/153 static pages
# 19 guards + self-tests, 0 failing:
npm run check:iicrc-terminology && npm run test:iicrc-terminology
npm run test:course-completeness
```

Rendered-output check (the one that caught a violation source-scanning missed):
```bash
grep -rl "CARSI" .next/server/app | wc -l          # 240 — positive control
grep -rlE "(WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST) ?[+,] ?(WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)" .next/server/app | wc -l   # 0
grep -rlE "IICRC [a-z]+ training" .next/server/app | wc -l   # 0
grep -rl "counts toward maintaining" .next/server/app | wc -l # 0
```

## 7. Deferred + open questions

**Deferred**

| Item | Owner | Blocking | Why |
|---|---|---|---|
| Two pre-existing whole-line-allow bypasses: any line with `IICRC CEC` exempts the "IICRC courses" rule; the preposition allow exempts the approved-school rule | next agent | no | Pre-date this branch; both want the proven `neutralise` treatment, on a fresh branch off main |
| `JsonLd.tsx:270` accepts `credentialAwarded` verbatim — a numeric CEC/provider id in a future designation name would enter the schema | next agent | no | Codex documented warning; no current designation contains digits |
| `check-course-visibility-predicate.mjs:137` treats any status literal within 220 chars as a safe union | next agent | no | Codex documented warning |

**Open questions**

| Question | Owner | Blocking |
|---|---|---|
| Codex round 3 has never run against any head of this branch | founder / next agent | **YES** — gate needs review bound to the exact head |
| Is the ollama fallback acceptable as sole evidence here? It produced 3 fabrications + 2 false PASSes in 5 rounds on this branch | founder | yes |

## 8. Pick up here

### Start here

1. **Fix the live regression on main first** (§9, risk 1) — it is one line and is currently
   serving on prod.
2. Rebase onto `origin/main` (`72fd7527`). #657 was **squash-merged**, so this branch's real
   merge commit is not an ancestor; expect the `public/llms.txt` hunk to conflict and
   resolve in favour of this branch's version.
3. Re-run the Phase 0 gates; the rebase mints a new SHA.
4. Dispatch Codex against that SHA once quota resets (**after 2026-08-08 15:22**).
5. Drain findings, re-gate, re-review. Then receipt → push → one PR.

### Do not redo

- Do not re-derive the acronym→topic map. **Never map CRT or OCT to a CARSI designation.**
- Do not re-run the file-level acronym transformer; it re-broke an exempt third-person line
  twice. The line-scoped version is in the scratchpad.
- Do not trust `exit 0` from a `codex exec` wrapper — check the report file exists.
- Do not use a whole-line `allow` for any new exemption.
- Do not touch `stash@{0}` — pre-existing, from `main`.
- Do not fabricate CEC hours, IICRC provider numbers, reviews, lesson durations or
  credential ids.

### First command to run

```bash
cd ~/gauntlet-worktrees/carsi-credential-20260807 && git log --oneline -1 && npm run check:iicrc-terminology && npm run test:course-completeness
```

## 9. Risk notes

1. **LIVE REGRESSION ON MAIN.** PR #657 was merged as `72fd7527` carrying only its first
   commit. My follow-up `1e80843b` was committed locally and **never pushed**, so
   `origin/main:public/llms.txt:110` still reads *"Courses award IICRC Continuing Education
   Credits (CECs)"* against **zero** approvals — an unsupported licence-critical claim on
   the surface built to be quoted by AI engines. `git branch -r --contains 1e80843b` returns
   empty. main deploys to prod. **This is the highest-priority item.**
2. A rebase is required and will conflict on `public/llms.txt` because main took a squashed
   copy of the same work.
3. No review evidence binds to `23875663`. The gate forbids self-certifying.
4. The guard's exemptions are broad by necessity. Three times a fix of mine tripped its own
   rule, and once an exemption I wrote for type docs hid a live violation on `/pricing`.
   Re-run the guard after every batch, and check the **built** output, not just source.
5. `check:cec-surfaces` throws `ERR_MODULE_NOT_FOUND` in a fresh worktree before `npm ci` —
   environment, not a defect.

## 10. Handoff quality check

Every gate result above came from a tool run in this session and is in the cited log. No
process is claimed running. Nothing is claimed shipped — this branch has never been pushed.
The one thing that DID ship (#657) shipped incomplete, and that is risk 1.

---

Handoff complete. Next safe action: push the one-line `public/llms.txt` CEC fix to main via
its own small PR, because that claim is live on production right now.
