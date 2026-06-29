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

## Continual Learning

This repo emits signal to `.harness/learning/*.jsonl` for the weekly distillation routine (RA-1745). If you notice something the system should learn from, append a structured entry — do not stop work to reason about meta-rules. Schema and consumer per RA-1745.
