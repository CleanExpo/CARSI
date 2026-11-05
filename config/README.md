# Repository configuration (JSON)

Tooling configs kept out of the repo root. **`package.json`**, **`package-lock.json`**, **`tsconfig.json`** and **`.reticle.json`** stay at root (their tools only look there).

| File                                           | Purpose                                                       |
| ---------------------------------------------- | ------------------------------------------------------------- |
| [`visuals.config.json`](visuals.config.json)   | Premium visuals scanner mode and allowlists (`check-visuals`) |
| [`media.manifest.json`](media.manifest.json)   | Self-hosted media provenance for marketing pages              |
| [`vitest.config.ts`](vitest.config.ts)         | Unit test runner                                              |
| [`vitest.pg.config.ts`](vitest.pg.config.ts)   | Postgres integration tests                                    |
| [`playwright.config.ts`](playwright.config.ts) | Playwright E2E (`npm run test:e2e`)                           |

Run the visuals gate: `node scripts/premium-visuals/check-visuals.mjs --root .`

## Why `.reticle.json` stays at the root

`.reticle.json` holds the Reticle project metadata (`projectId`, framework). `@reticlehq/next` reads it only from `process.cwd()` when `next dev` starts; there is no option or environment variable that points it anywhere else. If it moves into `config/`, the dev server silently stops finding this project's Reticle daemon and falls back to the default port with no error. `src/lib/reticle-config.test.ts` fails if the file moves again (GP-684).
