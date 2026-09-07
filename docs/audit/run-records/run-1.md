# GP-567 — Run 1 record

**Date:** 2026-09-07 · **Base:** `origin/main` @ `2aa6b9a2` ·
**Branch:** `phillmcgurk/gp-567-goal-carsi-full-catalogue-audit-100-true-or-justified`
**Mode:** audit + research only. No live copy changed, no guard modified, no course edited.

## Ledger counts

| Status | Count |
| --- | ---: |
| VERIFIED | 13 |
| JUSTIFIED | 2 |
| GAP | 9 |
| CONFLICT sidecars | 0 |
| **Total entries** | **24** |

No cross-engine conflict was recorded because no contested claim required a second
engine this run — see "Second engine" below.

## What this run established

**The catalogue, measured.** 80 live course URLs (sitemap and JSON-LD agree), 95
WordPress legacy records (84 published), 71 seed courses on `origin/main`. 182
distinct slugs across all three sources.

**The parity-gap number was wrong in both directions.** Naive slug matching reports
78 legacy-only courses. Three matchers — exact slug, normalised title, token
overlap ≥0.6 — reduce that to **18 genuine gaps** (17 published, 1 draft). 48
legacy records are simply slug-renamed. The card's figure of 31 is not reproduced
by any matcher setting tried, and is filed as a GAP against the card itself.

**Two card figures are not reproducible.** "93 planned / 5 seeded" does not match
the 71 seed courses on `origin/main`. Both are recorded as UNOBSERVED rather than
quietly reconciled.

**GP-525 changed shape but did not go away.** It was filed when the CEC approvals
registry held zero entries. The registry now holds **38 approved entries** (batch
dated 2024-01-18, evidence `CARSI_courses.pdf` supplied by the founder 2026-08-27).
But `carpet-cleaning` and `carpet-cleaning-basics` — the two courses GP-525 names —
are **still not among the 38**. Do not close GP-525 on the grounds that the
registry is no longer empty.

**Finding #1 is a language finding, not a lie.** The live `/courses` meta
description calls CARSI "an IICRC CEC Accredited provider" and the og:description
adds "Earn continuing education credits". Because the registry now holds 38
approvals, the underlying claim is filed **JUSTIFIED (medium)** — founder-supplied
secondary evidence, no primary IICRC register URL located. The finding is that
this is prohibited language on a public surface, whether or not it is true.

**Every repo guard passes while the live site serves prohibited language.** Five
guards exit 0. They scan repo source; the strings are served from live page
metadata. The blind spot is structural, not a missing rule — no amount of guard
tuning reaches it.

**GP-526 has a live residual.** Four live course URLs still lead with IICRC
discipline acronyms: `cct-commercial-carpet-core`, `wrt-water-damage-essentials`,
`fsrt-fire-smoke-restoration-core`, `asd-structural-drying-core`. GP-526 fixed the
render boundary and was closed Done; URLs were not in that fix.

**The currency picture is worse than 2021-vs-2025.** 274 S500 citation lines across
49 files. 20 lines assert the 2021 edition; **zero assert 2025**, against the estate
ruling. **233 lines cite S500 with no edition at all** — the quiet majority, and the
one no future sweep can detect as stale.

**A verified negative, recorded so nobody chases it.** `cppp40421_unit_code` exists
in the legacy schema but is populated on zero records. There is no live AQF
unit-code exposure.

## Deferred — explicitly not done this run

| Deliverable | State | Why |
| --- | --- | --- |
| D5 role × market matrix | **not started** | Needs per-course content analysis across 182 slugs; a run of its own |
| D6 benchmark matrix vs AQF/ISO | **not started** | Depends on D5; also the highest-risk deliverable to get wrong, so it should not be rushed at the end of a run |
| D8 fresh-context citation audit | **not started** | Should run against a larger ledger than 24 entries to be worth the pass |
| Cross-engine verification | **not exercised** | No contested claim arose that a second engine would settle |
| `check:cec-surfaces` | **not run** | Imports `typescript`; a git worktree has no `node_modules`. Environment limit, not a repo defect |
| D2 full-catalogue coverage | **batch 1 only** | 24 entries covers catalogue-level and licence-critical claims, not per-lesson content |

## Second engine

The founder directed `perplexity/sonar-deep-research` via OpenRouter. **OpenRouter is
exhausted**: HTTP 200, `total_credits` 2619.31043075 against `total_usage`
2619.308990219 — **$0.00144 remaining**, against a deep-research call costing dollars.
`PERPLEXITY_API_KEY` does exist in `~/.hermes/.env`, so a direct lane is available
without placing any new key. It was not used this run because no claim reached the
contested threshold that justifies a metered research call — every finding above is
settled by primary observation of the live site or the repo. Recorded as a founder
spend decision, not topped up.

## Next run — first batch named

**Batch 2: the 18 genuine parity-gap courses**, `docs/audit/parity-analysis.json`
→ `parity_gaps[]`, the 17 published ones first. For each: resolve the CEC-hours
claim against the 38-entry registry, the discipline-acronym exposure, and the
standards citations. This batch is chosen because every one of these courses is
published in the legacy platform while absent from the live catalogue, so each is
both a content-truth question and a live-exposure question at once.

Then batch 3: the 12 token-overlap matches, whose slug identity is a heuristic
judgement and should be confirmed or overturned individually before any inventory
number built on them is cited.
