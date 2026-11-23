# Product engineering phases (CARSI)

| Phase | Status | Deliverable |
|-------|--------|-------------|
| 1 — Audit & conflicts | Shipped | `.agents/AUDIT-2026-11-23.md`, `npm run audit:skill-references` |
| 2 — Foundations | Shipped | `.agents/skills/`, `npm run check:approved-dependencies` |
| 3 — Visual engineering | Shipped | Brand fonts (`src/lib/brand/fonts.ts`), `docs/design-system/brand-typography.md` |
| 4 — Learning experience | Shipped | `interactive-primitives.tsx`, patterns in `interactive-learning-patterns.md` |
| 5 — Automated quality | Shipped | `npm run quality:sda-gate` (`SDA_FULL=1` runs `prisma generate` first) |
| 6 — Business optimization | Shipped | Catalogue `course_cta` contexts (`catalogue:slug`); analytics doc update |

| Visual backlog | In progress | `hero-missing-media` / `no-motion` until `@cleanexpo/premium-visuals`; `css-art` on public pages — triage in `.agents/references/premium-visuals-triage.md` |