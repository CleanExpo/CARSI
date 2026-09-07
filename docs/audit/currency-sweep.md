# GP-567 D3 — Standards currency sweep

Generated `2026-09-07T07:29:26Z` by `scripts/audit/build-sweeps.mjs`.

## Reproduce

```
git grep -nI -E S500[^0-9]{0,3}(20[0-9]{2})? -- *.ts *.tsx *.mjs *.js *.json *.md
```

## Counts

| Measure | Count |
| --- | ---: |
| Total S500 citation lines | 274 |
| Distinct files citing S500 | 49 |
| Lines asserting the **2021** edition | 20 |
| Files asserting the **2021** edition | 16 |
| Lines asserting the **2025** edition | 0 |
| Lines citing S500 with **no edition at all** | 233 |

## Finding

The estate ruling (2026-09-07, GP-560) is that course content citing S500 teaches the
**2025** edition. The corpus currently asserts 2021 on **20 lines across 16 files**, and
cites S500 with **no edition named on 233 lines** — the larger and quieter problem, because an
unversioned citation cannot be detected as stale by any future sweep.

**Recommended control (not built this run):** a guard requiring every S500 citation to
name an edition. An unversioned citation is the failure mode that survives edition bumps.

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

