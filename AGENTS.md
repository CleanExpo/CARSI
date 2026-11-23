# CARSI agent rules (Codex entry point)

Codex reads this file automatically. The rule files live in `docs/agents/`. Read and follow both
before any work in this repo. Keep these references; `scripts/check-agent-doc-entrypoints.test.mjs`
fails CI if they break (GP-680).

Licence, course production and IICRC terminology rules:
@docs/agents/CLAUDE.md

Premium Visual & Motion Standard, verification gate and compound loop:
@docs/agents/AGENTS.md

Product engineering skills (specialised workflows — not always-on):
@.agents/skills/README.md

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
