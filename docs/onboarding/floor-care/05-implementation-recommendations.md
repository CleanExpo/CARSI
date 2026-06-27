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

**Structured quizzes (built).** The 11 module knowledge-checks are now structured, auto-marked quizzes
(`LmsQuiz` / `LmsQuizQuestion`) instead of self-marked inline text. The question bank lives in
`data/seed/floor-care-quizzes.json`; the matching lessons carry `contentType: 'quiz'`, so the lesson
player renders them via `QuizPlayer`, scores them server-side, enforces attempts, and records each
attempt against the learner. Each quiz's pass mark mirrors `03-assessment-framework.md` (90% for the
safety/reputation-critical modules, 80–85% elsewhere).

> **Seed order matters.** Quizzes are a separate seed step from the catalogue:
> ```bash
> npm run db:seed-courses              # recreates lessons (knowledge-checks are contentType 'quiz')
> npm run db:seed-floor-care-quizzes   # creates the LmsQuiz/LmsQuizQuestion rows they point to
> ```
> Run the catalogue seed first (the quiz needs its course to exist); both steps are idempotent.

**Publishing.** To verify and take the course live, follow `publish-runbook.md` (seed order, quiz
smoke-test, go-live and rollback). Publishing is an operator step against the production database.

**Pricing / billing.** The course is sold as a **CARSI Maintenance Company Onboarding** organisation
subscription — **AUD $1,295/month + GST, unlimited students** — recorded on the course in `meta.pricing`
and in `docs/onboarding/README.md`. It is provisioned for the client (not individual self-checkout), so
the course is kept `isFree`/`$0` in the catalogue to avoid a misleading one-off price. **Wiring the
recurring subscription billing (Stripe) is a separate build** and is not part of this content work.

**Recommended next LMS steps:**
- Track practical sign-offs against the learner record so the 30/60/90 gates are visible to supervisors.
- Only publish (move off draft) once content is reviewed against the guardrails and the company
  placeholders are filled.

## 3. Add video training (where it earns its place)

> **Built.** A per-lesson video pipeline is wired: 27 lesson scripts in
> `data/video/course-lesson-video-briefs.json` and a generator (`npm run video:lessons:plan` /
> `video:lessons:generate`) that renders HeyGen avatar videos with SRT subtitles and writes them into
> each lesson's `resources`. It is language-ready (English + subtitles now; other languages later).
> Run it per `video-runbook.md` on a machine with the API keys — it is spend-bearing and manual.

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
