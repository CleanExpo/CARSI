# CARSI agent rules (Claude Code entry point)

The rule files live in `docs/agents/`. Claude Code only auto-loads this file, so it imports them.
Keep these imports; `scripts/check-agent-doc-entrypoints.test.mjs` fails CI if they break (GP-680).

Licence, course production and IICRC terminology rules:
@../docs/agents/CLAUDE.md

Premium Visual & Motion Standard, verification gate and compound loop:
@../docs/agents/AGENTS.md
