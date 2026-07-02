@../Unite-Hub/.portfolio/PORTFOLIO.yaml

## Identity (SSOT)
**Canonical name:** CARSI
**Aliases:** "Online Training LMS"
**Canonical local path:** `D:$canon`
**GitHub:** `CleanExpo/CARSI`

> Registry: see `D:\Unite-Hub\.portfolio\PORTFOLIO.yaml` (single source of truth)

---# CLAUDE.md

Project-specific guidance for CARSI.

## Compound Engineering loop

Autonomous and semi-autonomous work follows the continuous ship loop in
`docs/agent-framework/COMPOUND_ENGINEERING_LOOP.md` (Plan → Work → Review →
Compound → Kanban movement). Every code-modifying pass must pass the
`docs/agent-framework/CARSI_VERIFICATION_GATE.md` checklist, and `npm run
type-check` is mandatory before any pass is marked Done.

## Course production — Australian-produced (MUST)

**Every CARSI course, module, lesson, quiz, trailer and piece of course marketing is
Australian-produced. This is non-negotiable.** CARSI operates in the Australian market:
Australian English spelling (odour, colour, metre, mould, licence/practise, -ise), Australian
power (**230 V / 50 Hz, 10 A GPO, RCD/safety switch, AS/NZS** — never 115 V / US 15 A circuits),
**metric units** (metres, m², litres, m³/h — imperial only in parentheses), products **available
in Australia** in 240 V form (with a dated availability check), **AS/NZS + Safe Work Australia**
standards (IICRC framed in the AU context), and **AUD** pricing. US/UK spelling, voltages, or
US-only products are defects — fix before publish. Full standard + checklist:
`.claude/skills/carsi-course-production/SKILL.md` (invoke it for any course work).

## Continual Learning

This repo emits signal to `.harness/learning/*.jsonl` for the weekly distillation routine (RA-1745). If you notice something the system should learn from, append a structured entry — do not stop work to reason about meta-rules. Schema and consumer per RA-1745.
