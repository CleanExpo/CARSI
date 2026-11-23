# Skills index (retired)

Legacy `skills/**/*.skill.md` files were removed in favour of the **CARSI Product Engineering Skill System**.

## Use this instead

| Location                                                  | Purpose                                              |
| --------------------------------------------------------- | ---------------------------------------------------- |
| [`.agents/skills/README.md`](../.agents/skills/README.md) | Skill catalogue (45 workflows)                       |
| [`.agents/SKILLS-COMPLETE.md`](../.agents/SKILLS-COMPLETE.md) | Completion receipt — `npm run verify:agent-skills` |
| [`.agents/references/`](../.agents/references/)           | Shared standards (libraries, quality gates, visuals) |
| `AGENTS.md`                                               | Always-on entry + link to skills                     |
| `docs/agents/`                                            | Licence, premium visuals, IICRC rules                |
| `.claude/skills/`                                         | Course production & course-truth (Claude Code)       |

Regenerate project skills after manifest edits:

```bash
node scripts/bootstrap-carsi-agent-skills.mjs
```
