# GP-567 D3 — Standards currency sweep

Generated `2026-09-07T14:49:59Z` by `scripts/audit/build-sweeps.mjs`.

## Reproduce

```
git grep -nI -E S500[^0-9]{0,3}(20[0-9]{2})? -- *.ts *.tsx *.mjs *.js *.json *.md :(exclude)docs/audit/* :(exclude)scripts/audit/* :(exclude).claude/skills/course-truth/*
```

## Counts

<!-- COUNTS-TABLE-BEGIN -->
| Measure | Count | Class |
| --- | ---: | --- |
| Total S500 citation lines | 274 | total |
| Distinct files citing S500 | 49 | — |
| Lines asserting the **2021** edition | 20 | edition-class |
| Files asserting the **2021** edition | 16 | — |
| Lines asserting the **2025** edition | 0 | edition-class |
| Lines citing S500 with **no edition at all** | 233 | edition-class |
| Lines asserting **another edition** (2026) | 21 | edition-class |
<!-- COUNTS-TABLE-END -->

The 4 line classes partition the total: 20 + 0 + 233 + 21 = 274.

## Finding

The estate ruling (2026-09-07, GP-560) is that course content citing S500 teaches the
**2025** edition. The corpus currently asserts 2021 on **20 lines across 16 files**, and
cites S500 with **no edition named on 233 lines** — the larger and quieter problem, because an
unversioned citation cannot be detected as stale by any future sweep.

**Recommended control (not built this run):** a guard requiring every S500 citation to
name an edition. An unversioned citation is the failure mode that survives edition bumps.

## Finding — 21 lines assert S500 2026

**21 lines across 6 file(s) assert an S500 2026 edition.**
This is a currency claim in the opposite direction to the one this sweep was built to
find: not a stale edition, but an edition asserted as published. It is UNVERIFIED here.

CARSI's licensed section index (`lib/standards/s500-sections.ts`, per CLAUDE.md mirrored
in RestoreAssist) is **not present in this repository**, so no licensed source is
reachable from this checkout to confirm or deny that such an edition is published.
Per CLAUDE.md, a claim about a standard is verified against the owner's licensed store,
never a web scrape, and an ABSENCE claim about a standard is banned outright — so this
sweep records what the corpus asserts and does **not** rule on whether it is true.

All affected files are course-update **drafts** carrying `Status: DRAFT — founder review
before any DB apply`, so nothing here is live course content today. The exposure is on
apply: these lines become published course copy the moment a draft is applied.

**Recommended action:** verify against the licensed index before any of these drafts is
applied. Filed in the evidence ledger as GP567-026.

### Files asserting another edition

- `docs/course-updates/06-water-damage-litigation-support.md`
- `docs/course-updates/09-fire-and-smoke-core-principles.md`
- `docs/course-updates/10-applied-structural-drying-core.md`
- `docs/course-updates/11-hvac-systems-and-iaq.md`
- `docs/course-updates/12-water-damage-restoration-essentials.md`
- `docs/course-updates/README.md`

## Files asserting S500:2021

- `.claude/skills/carsi-course-production/SKILL.md`
- `CLAUDE.md`
- `SPEC.md`
- `docs/course-updates/06-water-damage-litigation-support.md`
- `docs/course-updates/12-water-damage-restoration-essentials.md`
- `docs/course-updates/27-moisture-measurement-and-documentation.md`
- `docs/course-updates/README.md`
- `docs/iicrc-compliance.md`
- `docs/specs/2026-07-09-iicrc-compliance-completion.md`
- `scripts/check-standards-claims.mjs`
- `scripts/check-standards-claims.test.mjs`
- `src/lib/course-kit/ai-course-builder-guard.ts`
- `src/lib/course-kit/standards-excerpt.test.ts`
- `src/lib/course-kit/standards-excerpt.ts`
- `src/lib/server/ai-course-builder.ts`
- `src/lib/server/margot-knowledge-base.ts`

