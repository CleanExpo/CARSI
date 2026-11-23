# Product engineering phases (CARSI)

## Skill system — 100% complete

| Check | Command |
|-------|---------|
| Catalogue integrity | `npm run verify:agent-skills` |
| Cursor IDE mirror | `npm run sync:cursor-skills` |
| SDA gate | `npm run quality:sda-gate` |
| Receipt | `.agents/SKILLS-COMPLETE.md` |

## Phase deliverables

| Phase | Status | Deliverable |
|-------|--------|-------------|
| 1 — Audit & conflicts | Done | `npm run audit:skill-references`, `.agents/AUDIT-2026-11-23.md` |
| 2 — Foundations | Done | 44 skills, `npm run check:approved-dependencies` |
| 3 — Visual engineering | Done | Brand fonts, `premium-visuals-triage.md`, manifest sync |
| 4 — Learning experience | Done | Interactive primitives + patterns reference |
| 5 — Automated quality | Done | `sda_evidence_gate.py`, `quality:sda-capture`, SDA gate |
| 6 — Business optimization | Done | Catalogue analytics contexts |

## Product backlog (outside skill scaffolding)

Marketing `hero-missing-media` / `css-art` until premium-visuals rollout and page refactors — see `.agents/references/premium-visuals-triage.md`.