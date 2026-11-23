# CARSI Product Engineering Skills — completion receipt

**Status:** Skill system complete (tooling + catalogue). Product visuals backlog is tracked separately.

## Verify locally

```bash
npm run verify:agent-skills
npm run sync:cursor-skills      # optional: mirror into .cursor/skills for IDE discovery
npm run quality:sda-gate
SDA_FULL=1 npm run quality:sda-gate
```

## Catalogue

- **45 skills** in `.agents/skills/` (regenerate: `node scripts/bootstrap-carsi-agent-skills.mjs`; `carsi-git-commit-engineering` is hand-maintained)
- **8 shared references** in `.agents/references/`
- **Entrypoints:** `AGENTS.md`, `.claude/CLAUDE.md`, `docs/agents/*`

## Not part of “skills done” (tracked elsewhere)

- `hero-missing-media` until `@cleanexpo/premium-visuals` is installed
- Marketing `css-art` gradients — visual refactors per `premium-visuals-triage.md`
- Course diagram SVGs — allowlisted; instructional assets, not marketing art

## CI / smoke

`verify:product-excellence` and `quality:sda-gate` both run `verify:agent-skills`.

Last verified: run `npm run verify:agent-skills` (must exit 0).