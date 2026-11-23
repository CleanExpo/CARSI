# CARSI Product Engineering Skills

Portable Agent Skills for Cursor (`.agents/skills/`; mirror via `npm run sync:cursor-skills` → `.cursor/skills/`). **Persistent rules** remain in `AGENTS.md` and `docs/agents/`. Skills activate for specialised workflows — they are not always-on instructions.

**Receipt:** `.agents/SKILLS-COMPLETE.md` · **Verify:** `npm run verify:agent-skills`

**Principle:** Every feature should make CARSI easier to use, more valuable to restoration professionals, and more commercially successful.

## Shared references

| File                                             | Purpose                              |
| ------------------------------------------------ | ------------------------------------ |
| `../references/engineering-principle.md`         | Product engineering north star       |
| `../references/authoritative-docs.md`            | Single source map — do not duplicate |
| `../references/approved-libraries.md`            | Dependency governance                |
| `../references/quality-gates.md`                 | Verification commands                |
| `../references/visual-surfaces.md`               | Marketing vs learning vs admin UI    |
| `../references/interactive-learning-patterns.md` | Interactive lesson patterns          |

## Disciplines

### Product (`product/`)

- `carsi-product-strategy`, `carsi-spm`, `carsi-architecture`

### Frontend (`frontend/`)

- `carsi-nextjs-engineering`, `carsi-design-system`, `carsi-premium-ui`, `carsi-visual-storytelling`, `carsi-motion-design`, `carsi-responsive-design`, `carsi-interaction-design`, `carsi-tailwind-engineering`, `carsi-ui-components`

### Learning (`learning/`)

- `carsi-learning-experience`, `carsi-interactive-learning`, `carsi-course-player`, `carsi-assessment-engine`, `carsi-learning-progress`, `carsi-course-production`, `carsi-course-voiceover`, `carsi-demo-screencasts`, `carsi-course-thumbnails`, `carsi-iicrc-compliance`

### Customer (`customer/`)

- `carsi-student-dashboard`, `carsi-coaching-experience`, `carsi-learning-paths`, `carsi-accountability`, `carsi-commerce`, `carsi-entitlements`

### Backend (`backend/`)

- `carsi-database-engineering`, `carsi-api-contracts`, `carsi-security-engineering`

### Quality (`quality/`)

- `carsi-visual-qa`, `carsi-accessibility`, `carsi-e2e-testing`, `carsi-performance`, `carsi-security-review`, `carsi-regression-testing`, `carsi-production-readiness`

### Growth (`growth/`)

- `carsi-seo`, `carsi-localization-au`, `carsi-conversion-optimization`, `carsi-product-analytics`, `carsi-content-strategy`, `carsi-geo`

## Regenerating skills

After editing `scripts/bootstrap-carsi-agent-skills.mjs` manifest:

```bash
node scripts/bootstrap-carsi-agent-skills.mjs
```

## Legacy note

The former `skills/*.skill.md` tree is retired. Deep course production remains in `.claude/skills/carsi-course-production/`.
