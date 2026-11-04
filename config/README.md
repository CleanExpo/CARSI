# Repository configuration (JSON)

Tooling configs kept out of the repo root. **`package.json`**, **`package-lock.json`**, and **`tsconfig.json`** stay at root (npm / TypeScript require them there).

| File                                           | Purpose                                                       |
| ---------------------------------------------- | ------------------------------------------------------------- |
| [`visuals.config.json`](visuals.config.json)   | Premium visuals scanner mode and allowlists (`check-visuals`) |
| [`media.manifest.json`](media.manifest.json)   | Self-hosted media provenance for marketing pages              |
| [`reticle.json`](reticle.json)                 | Reticle project metadata (`projectId`, framework)             |
| [`vitest.config.ts`](vitest.config.ts)         | Unit test runner                                              |
| [`vitest.pg.config.ts`](vitest.pg.config.ts)   | Postgres integration tests                                    |
| [`playwright.config.ts`](playwright.config.ts) | Playwright E2E (`npm run test:e2e`)                           |

Run the visuals gate: `node scripts/premium-visuals/check-visuals.mjs --root .`
