# Handoff — CARSI gauntlet run: 25 commits green, blocked on independent re-review

**Date:** 2026-08-07 (written ~11:35 local)
**Worktree:** `~/gauntlet-worktrees/carsi-credential-20260807`
**Branch:** `gauntlet/carsi-credential-landing` @ `3cb09b2b20e80beb6762a220b10fb5242750860e`
**Base:** `origin/main` @ `e6df959169a8ec887dccb75b11ddc6b05634cead` (merge-base equals it — not stale)
**Delta:** 25 commits · 60 files · +2147 / −336
**Phase 0 log:** `.handoff-logs/handoff-20260807-1130.log`

---

## 1. Summary

**State: WIP-BLOCKED.** Everything is committed and every local gate is green, but nothing is
pushed and no PR exists. The release gate requires an independent review bound to the exact head;
the review that ran returned **FAIL** on the previous head `77373a5c`, its P0 is now drained, and
**`3cb09b2b` has not been reviewed**. A PASS for the old SHA is invalid by the gate's own rule.

**Definition-of-Done: 3 of 5.** Rules 4 and 5 fail — not PR'd, and the user-visible outcome
(32 intro videos reaching the catalogue) is not demonstrable because that work is blocked on
founder decisions, not code.

### Phase 0 gates — all green on `3cb09b2b`

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **0** (0-line error file) |
| `npm run lint` | **0** |
| `npx vitest run` | **0** — 139 files, 1005 tests |
| `npx next build` | **0** |
| 18 guards + self-tests | **0 failing / 18** |

Tree clean. One stash exists (`stash@{0}` "DISCARD data-file churn 2026-07-13", on `main`) —
**pre-existing, not this session's. Leave it alone.**

---

## 2. Where it started

A `/gauntlet-loop` pair: CLI grinding CARSI's course/credential landing page against a Coursera
Professional Certificate page; Desktop grinding RestoreAssist against Stripe's pricing page. The
run widened as the founder added scope: licence correctness, marketing/schema/metadata, a
world-#1 IICRC-CEC positioning goal, E-E-A-T leadership, learning styles, and rendering 32 course
intro videos.

---

## 3. Decisions locked + what shipped

**Nothing shipped. All 25 commits are local to this worktree — not pushed, no PR.**

The push was attempted and correctly **blocked by the release gate**: `missing exact-SHA PR
release receipt`. That ordering is deliberate — nothing reaches the remote before review — so the
reviewer was given a self-contained git bundle instead (`/tmp/carsi-review2.bundle`, cloned on the
Mini at `/tmp/carsi-rev`).

### The dominant finding — six instances of one pattern

Built, reviewed, reaching nobody. Each verified, each fixed:

| # | Defect | Evidence |
|---|---|---|
| 1 | `isPreview` unreachable | curriculum route 401s (:34), 403s (:78), returns `is_preview` only at :116 *after both gates* |
| 2 | Verification path linked zero times | both `/verify/*` routes unauthenticated; course page `grep -c` = 0 |
| 3 | `EducationalOccupationalCredential` emitted nowhere | `buildPersonSchema` zero call sites; `@carsi/schema` never imported |
| 4 | Founder designation MUST enforced by no guard | `check:iicrc-terminology` exit 0 on the fully literal banned string |
| 5 | Three routes read the legacy `isPublished` column | 20 courses enrollable yet invisible in pathways, pathway progress, team assignment |
| 6 | Intro-video workflow could push a branch but never open its PR | five orphaned `chore/intro-video-results-*` branches, none merged |

### Licence remediation

44 discipline-acronym violations across 14 files, plus 14 `IICRC-aligned` occurrences — including
Google Ads keyword targets bidding on `[IICRC WRT certification]` at $4–6 CPC. The founder MUST
(CLAUDE.md § CARSI designation rule) had **no enforcing guard**; one now exists and fires on both
banned forms.

### Security

`security.yml` gated at `--audit-level=critical` while the tree carried **5 HIGH / 0 critical**, so
every one passed. Cleared first, raised second: `next` 16.2.9 → 16.3.0 (non-major per npm's own
`fixAvailable`) plus a non-forced `npm audit fix` took production advisories from 11 (5 high) to
**5 (0 high, 0 critical)**. Gate now `--omit=dev --audit-level=high`, proven to reject.

---

## 4. Key files

| File | Status | Note |
|---|---|---|
| `scripts/check-course-visibility-predicate.mjs` + `.test.mjs` | Created | Guard + self-test; brace-depth scan after regex failed 3× |
| `scripts/check-iicrc-terminology.mjs` | Modified | Designation rule added; refactored for testability (CLI-guarded) |
| `scripts/check-iicrc-terminology.test.mjs` | Created | 11 block / 10 pass |
| `scripts/check-source-citations.mjs` + `.test.mjs` | Created | E-E-A-T scorecard; authority ratio **10%** |
| `data/seed/source-registry.json` | Created | Tiered sources; `iicrc.org` NOMINATIVE-ONLY |
| `scripts/check-course-completeness.mjs` | Modified | Removed substring fallback manufacturing an intro-video pass |
| `src/lib/server/public-courses-list.ts` | Modified | Canonical predicate, bounded syllabus, preview-body strip |
| `src/components/seo/JsonLd.tsx` | Modified | `EducationalOccupationalCredential` + disclaimer |
| `app/(public)/courses/[slug]/page.tsx` | Modified | Syllabus, preview lesson, credential clarity |
| `.github/workflows/ci.yml`, `security.yml`, `generate-course-intro-videos.yml` | Modified | Guards wired; audit threshold raised; `pull-requests: write` |
| `docs/agent-framework/GAP-BACKLOG-2026-08-07.md` | Created | Evidence-backed backlog, every item cites file:line |

---

## 5. Running state

**Nothing running.** The duplicate render batch (run `31134450149`) was **cancelled**; its monitor
and the Codex review monitor were both stopped. Verified via `TaskStop`.

The Desktop half holds RestoreAssist worktree leases from earlier — not this session's process.

---

## 6. Verification — exact commands

```bash
cd ~/gauntlet-worktrees/carsi-credential-20260807
npx tsc --noEmit && npm run lint && npx vitest run     # expect 0 / 0 / 139 files, 1005 tests
npx next build                                          # expect 0
npm run test:course-visibility && npm run test:iicrc-terminology && npm run test:sources
npm run check:sources                                   # authority ratio, currently 10%
node scripts/check-course-completeness.mjs              # expect introVideo 37/37 missing, 0/37 finalised
```

Full Phase 0 evidence: `.handoff-logs/handoff-20260807-1130.log`.

**Do not run the Playwright suite unscoped against production** — `e2e/auth.setup.ts` performs a
real login with hardcoded credentials against whatever `PLAYWRIGHT_BASE_URL` points at. Scope to
`e2e/smoke.spec.ts` or `e2e/a11y.spec.ts`.

---

## 7. Deferred + open questions

### Deferred

| Item | Owner | Blocking | Why |
|---|---|---|---|
| **Independent re-review of `3cb09b2b`** | next agent | **YES — the only thing between here and a PR** | Codex is credit-blocked until 2026-08-08 15:22; ollama `gpt-oss:120b-cloud` is the sanctioned fallback |
| Land the 32 July intro videos | Phill | No | `chore/intro-video-results-29482425952` holds all 32, verified still live (HTTP 200, 11.4 MB). Publishing an avatar-fronted video on 32 public pages is a founder call |
| Live Google Ads keywords | Phill | No | Account may still bid on `[IICRC WRT certification]`; repo docs fixed, account unreachable from here |
| Per-course CEC hours · IICRC provider number · specimen credential id | Phill | No | Registry fail-closed; blocks credential-trust AAA+ |
| Real course reviews | Phill/ops | No | `getAggregateRating` fully wired and rendering nothing |
| Per-lesson timings | Phill/ops | No | 368 text lessons, 0 video; no measurable source exists |
| i18n / hreflang | next agent | No | **Structural gate** on the multi-language #1 goal: no `i18n` block, zero `hreflang`, `inLanguage` hardcoded `en-AU` in 5 schema nodes |
| 81 of 105 `findMany` lack `take` | next agent | No | Verification-gate rule 2, enforced by nothing |
| 5 remaining moderate advisories | next agent | No | 0 high, 0 critical |

### Open questions

| Question | Owner | Why it matters |
|---|---|---|
| Do the July renders meet the current quality bar? | Phill | Verified they used `engine=avatar_v` from that run's own log, so they carry the face-quality fix — but nobody has watched them |
| Should the completeness scorecard become blocking? | next agent | Advisory today; `--enforce=<slugs>` exists |

---

## 8. Pick up here

### Start here

1. Re-review `3cb09b2b` with the cross-vendor reviewer. The brief at
   `/private/tmp/.../scratchpad/reviewer-brief.txt` must be **regenerated with the new head SHA** —
   a re-emitted verdict for `77373a5c` is worthless.
2. Drain any P0/P1, re-run Phase 0, new SHA back to the reviewer.
3. Issue the receipt via `pr_release_gate.py issue`, then push and open **one draft PR**.

### Do not redo

- Do not re-render the intro videos. All 32 exist from 2026-07-16 and are live; I already
  re-rendered one by mistake and cancelled the batch.
- Do not re-derive the six wired-but-never-exercised findings — each is evidenced in §3.
- Do not push before the receipt exists; the gate blocks it and the ordering is correct.
- Do not touch `stash@{0}` — pre-existing, from `main`, not this session's.
- Do not trust a guard's green without its self-test; all three new guards now have one.
- Do not fabricate CEC hours, IICRC provider numbers, reviews, lesson durations, specimen
  credential ids, or completion statistics.

### First command to run

```bash
cd ~/gauntlet-worktrees/carsi-credential-20260807 && git log --oneline -1 && npx tsc --noEmit
```

---

## 9. Risk notes

- **I re-rendered work that already existed.** All 32 intro videos were rendered 2026-07-16 and
  still live. I dispatched a render before checking for prior artefacts; the check took 90 seconds
  and I ran it only after spending. Batch cancelled once found.
- **My proofs were unsound twice, caught by review both times.** I claimed a repo-wide grep proved
  exhaustiveness when the pattern structurally could not match a bare `{ isPublished: true }`; and
  I argued the July renders were fixed from commit timestamps rather than the run log. Conclusions
  survived; the reasoning did not.
- **A guard I canary-tested three times still had a fifth defect**, found only when the reviewer's
  P0 forced a committed self-test. Regex windows failed three times before a brace-depth scan.
- **A blanket sed inverted a comment's meaning** ("never branded as IICRC CEC Accredited") — caught
  only because a guard stayed red. Mechanical rewrites damage prose that *discusses* a banned term.
- **`npm audit fix --omit=dev` pruned the dev tree** — eslint and axe vanished, lint exited 127. A
  plain `npm install` restored it. Audit numbers alone looked fine.
- **Codex "failure" was a quota error, not a crash** — a 19-day-old memory claiming headless Codex
  is dead on both Macs was wrong and has been corrected.
- Nothing has been observed in production. Every fix here is a hypothesis until deployed.

---

## 10. Handoff quality check

| Rule | Held? |
|---|---|
| No claim tests passed without running them | Yes — Phase 0 log cited |
| No claim anything shipped that was not | Yes — "Nothing shipped" stated plainly |
| No claim a process is running | Yes — both monitors stopped, batch cancelled |
| Completed vs deferred separated | Yes — §3 vs §7 |
| First command provided | Yes — §8 |
| Unfinished work not dressed as a clean stop | Yes — WIP-BLOCKED, DoD 3 of 5 |
| Own errors recorded | Yes — §9, six of them |
| Commands portable across machines | Yes — worktree-relative |

**Handoff complete. Next safe action:** regenerate the reviewer brief against
`3cb09b2b20e80beb6762a220b10fb5242750860e` and dispatch the cross-vendor re-review.
