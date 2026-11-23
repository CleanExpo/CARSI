# CARSI agent rules (Claude Code entry point)

The rule files live in `docs/agents/`. Claude Code only auto-loads this file, so it imports them.
Keep these imports; `scripts/check-agent-doc-entrypoints.test.mjs` fails CI if they break (GP-680).

Licence, course production and IICRC terminology rules:
@../docs/agents/CLAUDE.md

Premium Visual & Motion Standard, verification gate and compound loop:
@../docs/agents/AGENTS.md

## Merges are Phill's only (ruled 23/11/2026)

Agents never run `gh pr ready` (except `gh pr ready --undo`, back to draft) or `gh pr merge`
on this repository, by any route (GitHub API, a script, auto-merge). Only Phill readies and
merges CARSI PRs: open a draft and leave it. `.claude/hooks/founder-merge-only.mjs` refuses
both commands in every Claude Code session that loads this checkout, including cloud sessions.
