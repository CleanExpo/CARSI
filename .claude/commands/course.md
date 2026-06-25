---
description: Orchestrate a new CARSI training course end-to-end (research → construct → develop → media → brand → ship) under the Compound Engineering loop and Verification Gate.
argument-hint: "<course topic>" [--stage=research|construct|develop|media|brand|ship] [--slug=<slug>]
---

# /course — new course orchestrator

You are building a **branded, on-brand CARSI training course** for restoration & cleaning
professionals (Australian, IICRC-aligned). This command is the front door: it routes the work
through six focused stage commands and **pauses at every spend gate and the ship gate**. It
calls no paid APIs itself — each stage owns its tooling.

**Request:** `$ARGUMENTS`

## Operating rules (always)
- Follow `docs/agent-framework/COMPOUND_ENGINEERING_LOOP.md` (Plan → Work → Review → Compound).
- Every code-touching stage must pass `docs/agent-framework/CARSI_VERIFICATION_GATE.md`; `npm run type-check` is mandatory before any stage is called Done.
- Auto-load the Priority-1 skills (`verification-first`, `orchestration`, `australian-context`, `design-system`) and en-AU defaults throughout.
- The single source of truth for course data is `data/seed/courses-catalog.json`. Media spend is real money — never skip the `--dry-run` step.

## Procedure
1. **Parse the request.** Extract the topic and (if present) `--slug` / `--stage`. If `--stage` is given, jump straight to that stage; otherwise run all stages in order.
2. **/course-research** → produce the verified evidence pack. Do not advance below the truth-finder publish threshold.
3. **/course-construct** → author the catalogue skeleton (modules → lessons) and a unique slug. Now `--slug` is fixed for the rest of the run.
4. **/course-develop** → write lesson bodies + quizzes into the skeleton.
5. **/course-media** → thumbnail (gpt-image-1), voice narration (ElevenLabs), and optional brand/lesson video (HeyGen). **Spend-bearing — dry-run, review, then generate with `--slug=<slug>`.**
6. **/course-brand** → enforce locked design tokens + en-AU tone + no overclaiming.
7. **/course-ship** → run the Verification Gate and seed. If `DATABASE_URL` is absent, report **Blocked** (do not claim Done).

## Stop conditions
- Research confidence below threshold → stop at step 2 and report what could not be verified.
- A spend gate the operator has not confirmed → stop and ask.
- Verification Gate failure → stop at step 7 with the failing output.

## Output
A short status per stage (artifact path + pass/fail), ending with the seeded course slug or a
clear **Blocked** reason.
