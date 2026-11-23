# Premium visuals findings — triage (check-visuals)

Scanner: `node scripts/premium-visuals/check-visuals.mjs --root .`  
Config: `config/visuals.config.json` (mode `report` today — findings do not fail CI).

## Finding types vs CARSI surfaces

| Rule | Marketing (enforce over time) | LMS / courses (different bar) |
|------|------------------------------|-------------------------------|
| `hero-missing-media` / `no-motion` | Needs `@cleanexpo/premium-visuals` on public pages | N/A (logged-in learn app) |
| `svg-asset` | Replace with photo/generated art | Course `public/courses/**/diagrams/**` instructional SVGs — allowlisted |
| `unmanifested-public-media` | Add `config/media.manifest.json` entry | Run `npm run media:manifest:sync` |
| `unmanifested-media` | Same — path in source must be in manifest | Same |
| `media-budget` | Re-encode to WebP/AVIF under budget | Same |
| `css-art` | Remove decorative radial/conic/clip-path art | Email templates allowlisted; fix `marketing-ui.ts` glow |

**Visual acceptance** is never automatic: owner review + Playwright 390/768/1440 + reduced-motion (`carsi-visual-qa` skill).

## Commands

```bash
node scripts/premium-visuals/check-visuals.mjs --root . --json   # full machine report
npm run media:manifest:sync       # dry-run missing public media entries
npm run media:manifest:sync -- --write
SDA_FULL=1 npm run quality:sda-gate   # includes prisma generate + type-check
```