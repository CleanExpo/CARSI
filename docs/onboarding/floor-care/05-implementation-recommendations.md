# Implementation Recommendations — LMS, Video, SOPs and Toolbox Talks

> This pack is the program. This file is how to roll it out and keep it alive — turning the documents
> into a live LMS course, supporting media, working SOPs, and a recurring toolbox-talk loop.

## 1. Issue the pack as the source of truth

- Adopt this `docs/onboarding/floor-care/` set as the controlled master for floor-care onboarding.
- Fill in every **[COMPANY TO CONFIRM]** placeholder (uniform, fleet/TruckMount, sign-in process,
  supplier accounts, escalation contacts and timeframes, refresher intervals) before first issue.
- Put it under version control with a named owner [COMPANY TO CONFIRM] and a review date. When a real
  incident or near-miss teaches us something, the fix goes into the pack — not just into someone's head.

## 2. Stand up the LMS course

A matching LMS course has been authored into the CARSI catalogue
(`data/seed/courses-catalog.json`, slug `floor-care-onboarding-operational-readiness`):

- **12 modules** mirroring `01-module-structure.md`, each with text lessons and a knowledge check
  (inline Q&A + answer key), ending in a final practical-assessment module.
- Seed it with `npm run db:seed-courses` (after `npm run type-check`); it starts as a **draft** and free.
- Keep the LMS lesson content and these docs in step — the docs are the master; the course is the
  delivery. When a doc changes, update the matching lesson.

**Recommended next LMS steps:**
- Add structured quizzes (the data model supports `LmsQuiz`/`LmsQuizQuestion`) so knowledge checks are
  auto-marked and recorded against the learner, instead of self-marked inline.
- Track practical sign-offs against the learner record so the 30/60/90 gates are visible to supervisors.
- Only publish (move off draft) once content is reviewed against the guardrails and the company
  placeholders are filled.

## 3. Add video training (where it earns its place)

Video is worth it for the things words struggle to show — **technique and safety**:

- Priority clips: PPE selection from an SDS; correct labelling/decanting; machine setup and safe
  operation per machine; wet-floor signage and barricading; a full strip-and-seal sequence; the
  site-arrival setup.
- Keep them short, practical and en-AU, ending on one clear action. **Captions and a transcript** for
  every public/lesson video.
- Media generation in CARSI is **spend-bearing and gated** — thumbnail (gpt-image-1) and voice
  (ElevenLabs) run `--dry-run` first with a spend confirmation. Do not generate without sign-off.
- Same guardrails as the docs: no overclaiming, no medical claims, defer cure/dilution/slip figures to
  the SDS/TDS and standards.

## 4. Turn checklists into working SOPs

The checklists are already SOP-shaped. To operationalise:

- Convert `vehicle-equipment-pre-start`, `site-arrival`, `chemical-ppe` and `machinery-maintenance` into
  the field format the crew actually uses [COMPANY TO CONFIRM — app, laminated card, or form].
- Make the **daily pre-start a recorded SOP** — completed and signed before departure, spot-checked by
  supervisors. This single SOP prevents most of the disruption matrix.
- Build per-surface and per-method SOPs from `standards/floor-surface-identification.md` and Module 5,
  each citing "confirm against the product SDS/TDS."
- Keep an SOP for **fault reporting and out-of-service tagging** from `checklists/machinery-maintenance.md`.

## 5. Run a toolbox-talk loop

Short, regular, real-world reinforcement keeps the standard alive:

- **Cadence:** a brief toolbox talk on a set rhythm [COMPANY TO CONFIRM — e.g. weekly/fortnightly].
- **Source material:** pull topics straight from this pack and from real events — a recent disruption
  (`02-risk-disruption-matrix.md`), a near-miss, a surface-damage close call, a confidentiality
  reminder, a new SDS.
- **Loop:** every disruption and near-miss is logged → reviewed → becomes a toolbox talk → and, if it's
  a durable lesson, updates the pack and the LMS course. That is how the program compounds instead of
  going stale.
- **Starter topics:** "If it is not checked, it can stop the job"; reading the SDS for PPE; wet-floor
  controls in occupied areas; the photo rule and CCTV conduct; matching pad/brush to surface; early
  communication of delays.

## 6. Suggested rollout sequence

1. Fill placeholders; assign an owner and review date.
2. Train supervisors on the assessment framework and sign-off form first — they run the program.
3. Issue the induction pack and run the first inductions.
4. Seed the LMS course (draft); pilot with one cohort; capture feedback.
5. Add auto-marked quizzes and learner sign-off tracking.
6. Produce the priority video clips (gated spend) once content is settled.
7. Start the toolbox-talk loop and the refresher cycle for safety-critical modules.

## 7. Keep it honest

Whatever the format — doc, LMS, video, SOP or toolbox talk — the guardrails do not change:
**Australian English; no overclaiming of accreditation, insurer, or compliance authority; no medical
claims; and the SDS/TDS and the relevant standard are always the authority over anything written here.**
This training supports good judgement on site. It does not replace it.
