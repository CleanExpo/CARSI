# CARSI — agent instructions (Codex + Claude)

CARSI is enrolled in the Unite-Group Nexus shared context plane
(`CleanExpo/nexus-task-bootstrap`, policy 1.0.0). Portfolio minimums live in your global
agent config; **this file plus `CLAUDE.md` are binding and take precedence locally.**

## Read `CLAUDE.md` first — it is the source of truth

`CLAUDE.md` in this repo carries the full, licence-critical CARSI rules. Codex does not
read `CLAUDE.md` automatically, so treat the summary below as mandatory and open
`CLAUDE.md` before any content, course, marketing, or IICRC/CEC change.

## Licence-critical guardrails (do not violate — these can cost the CEC licence)

- **IICRC CEC framing is fail-CLOSED.** Absent by default, added only by explicit,
  founder-confirmed per-course approval. A gate that defaults to "on"/"submit"/"eligible"
  is the bug signature — the 2026-07-17 fail-open incident emailed the IICRC on an
  unfinished course. `IICRC_CEC_AUTO_SUBMIT` must be treated as off unless explicitly `true`.
- **CEC hours only from the approvals registry.** `data/seed/cec-approvals.json` (validated
  by `npm run check:cec`) or an explicit founder-set positive `cecHours` are the ONLY
  sources. No inference from duration, prose, or meta. New courses ship `cecHours: 0`.
- **CARSI issues its OWN designations**, never IICRC discipline acronyms (WRT/ASD/AMRT/
  FSRT/CCT/TCST) and never "[discipline]-aligned". Set `iicrcDiscipline: null`.
- **Terminology:** "IICRC CEC Accredited" only — never bare "IICRC Accredited" or
  "IICRC-accredited course". CARSI is a CEC provider, not an IICRC course/cert provider.
- **Never feed IICRC standard text into any AI tool** and never reproduce standard text
  beyond a brief attributed reference.
- **Australian-produced content is non-negotiable:** en-AU spelling, 230 V/10 A/AS-NZS,
  metric units, AU-available products, AUD.

CI guards enforce these: `npm run check:iicrc-terminology`, `check:iicrc-compliance`,
`check:cec`. Fix a false positive by tightening the rule's allow-list, never by disabling it.
`npm run type-check` must pass before any pass is marked done.

## Coordination with the other agent

Claude Code and Codex are both active on this Mac. Work on a feature branch, announce the
files/branch you are editing, commit early, and `git fetch` + check branch state before
starting — the other agent may have pushed since your last read.
