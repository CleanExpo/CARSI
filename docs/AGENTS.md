<!-- Unite-Hub (CleanExpo/Unite-Hub) held the cross-repo portfolio registry; decommissioned 2026-06-20. No active replacement registry is wired here. -->

## Identity (SSOT)
**Canonical name:** CARSI
**Aliases:** "Online Training LMS"
**Canonical local path:** `D:$canon`
**GitHub:** `CleanExpo/CARSI`

> Registry: previously `D:\Unite-Hub\.portfolio\PORTFOLIO.yaml` (single source of truth); Unite-Hub decommissioned 2026-06-20, no active replacement wired here.

---

# AGENTS.md

Project-specific guidance for CARSI.

## Compound Engineering loop

Autonomous and semi-autonomous work follows the continuous ship loop in
`docs/agent-framework/COMPOUND_ENGINEERING_LOOP.md` (Plan → Work → Review →
Compound → Kanban movement). Every code-modifying pass must pass the
`docs/agent-framework/CARSI_VERIFICATION_GATE.md` checklist, and `npm run
type-check` is mandatory before any pass is marked Done.
