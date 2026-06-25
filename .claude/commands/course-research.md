---
description: Research a CARSI course topic into a verified, source-cited evidence pack before any course structure is built.
argument-hint: "<course topic>" [--discipline=WRT|CRT|ASD|OCT|CCT|FSRT|AMRT]
---

# /course-research — verified evidence pack

Turn a topic into a **fact-checked research pack** that later stages build on. Nothing here
spends money; the goal is verified ground truth and a clear learner frame.

**Topic:** `$ARGUMENTS`

## Load first
- `skills/verification/truth-finder.skill.md` — 4-tier source hierarchy, confidence scoring (publish ≥95% verified, **block <40%**).
- `skills/australian/australian-context.skill.md` — en-AU spelling, AU regulators (SafeWork Australia, state EPAs), AUD.
- `WebSearch` / `WebFetch` (load via ToolSearch) for live sources; prefer `.gov.au`, `.edu.au`, IICRC standards, and recognised industry bodies.

## Procedure
1. **Avoid duplication.** Read `data/seed/courses-catalog.json` and scan `data/*.docx` / `data/*.txt` source docs — if a near-identical course exists, say so and propose a differentiator instead of a duplicate.
2. **Determine the IICRC discipline** (WRT/CRT/ASD/OCT/CCT/FSRT/AMRT) if applicable; note CEC-hour relevance.
3. **Research the subject** with the truth-finder hierarchy. Capture each material claim with its source and a confidence score. Flag anything that cannot clear the threshold — it must not be taught as fact.
4. **Frame the learner.** Who takes this (technician, team owner, new entrant), their prior knowledge, the on-the-job outcome, and the single next action the course should drive.
5. **Note guardrails** (same as `src/lib/brand-video-assistant.ts`): do not overclaim IICRC/insurer/NRPG/compliance authority; AI and training support judgement, they don't replace standards or qualified professionals.

## Output
Write `data/courses/<slug>/research.md` containing:
- Proposed slug + working title + IICRC discipline + CEC relevance.
- Learner persona + outcome + single next action.
- Verified claims with sources and confidence scores; a separate "Unverified / excluded" list.
- AU regulatory hooks and any safety caveats.

**Gate:** if core claims sit below the truth-finder publish threshold, stop and report — do not
advance to `/course-construct`.
