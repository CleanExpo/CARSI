# SME review checklist — GP-445 assessment drafts (WS2b pilot)

Status: **DRAFTS ONLY.** Nothing in this batch is published or seeded to any database.
Everything under `data/seed/assessment-drafts/*.quizzes.json` is a reviewable proposal
for the founder (SME — Phill McGurk) to check, correct, and approve before it goes
anywhere near production. This runbook is the review procedure and the after-approval
publish path.

## Why this exists

Production carries 61 CEC-bearing IICRC CEC courses with zero assessments (GP-444,
production-verified). Ten of those already advertise a quiz in their live public
description — meaning students can currently see "Quiz" listed as a topic and find
none. This is a licence-relevant gap: CARSI's authority to sell IICRC CEC courses rests
on those courses being defensibly assessed.

This batch (GP-445, WS2b) is a 3-course pilot to calibrate the quality bar before the
same treatment is extended to the remaining catalogue. Get these three right — in depth,
in accuracy, in Australian-standard framing, and in honest source-gap disclosure — and
the pattern can scale. Get them wrong and every course after them inherits the mistake.

## The 3 pilot courses in this batch

| Course slug | CEC hours | Questions drafted | Source depth |
|---|---|---|---|
| `infectious-control-for-the-business-owner` | 7 | 20 | Full — 20 docx modules, all elaborated |
| `microbe-clean-basic-understanding-course` | 5 | 15 | Full — 20 docx modules, all elaborated |
| `level-2-mould-remediation` | 4 | 10 | **Thin — WP outline only, no docx.** See gap list below. |

Each draft file has the exact shape of `data/seed/floor-care-quizzes.json`: a
`courseSlug` binding, one or more `quizzes[]` entries, each with `quizId` (a stable
UUID), `title`, `passPercentage` (70 for all three, per WS2b spec), `attemptsAllowed`
(3), and a `questions[]` array of `{ questionText, options[], correctIndex, points,
sourceRef }`. The `sourceRef` field is **not** read by the seed script — it exists
purely so you (the SME) can trace every question back to the exact course-content
location it was written from, without having to re-derive it yourself.

## How to review each course (repeat per course, tick the box when done)

For each draft file, work through these six checks in order. Do not skip ahead — a
question that fails an earlier check (e.g. wrong answer) makes every later check about
it moot.

1. **Open the `sourceGaps` array first (if present).** `level-2-mould-remediation`
   has one; the other two don't. Read it before the questions — it tells you which
   modules have *no* real content behind them yet, so you know which questions are
   necessarily weaker before you judge them.
2. **Accuracy** — for every question, open the cited `sourceRef` (the docx module, or
   the WordPress description, or the cross-referenced CARSI course file named in the
   ref) and confirm: the question is actually answerable from that text, the marked
   `correctIndex` option is actually correct, and none of the distractor options are
   arguably also correct.
3. **Standards citations** — anywhere a question cites a number, regulation, or
   standard (e.g. "1000 ppm available chlorine", "Model WHS Regulations r.337", "IICRC
   S520 and S100", "P2 minimum"), confirm the figure is current and correctly
   attributed. These are the highest-risk items for licence exposure if wrong — verify
   with extra care.
4. **Australian-production standard** — run the `carsi-course-production` skill's
   checklist over every question and option: Australian English spelling, 230 V/10 A
   electrical framing (courses in this batch have none, but check anyway), metric
   units, AS/NZS + Australian regulator citations, AUD context, and — non-negotiably —
   "IICRC CEC course(s)" language, never "IICRC course(s)" or anything implying CARSI
   grants IICRC certification.
5. **Difficulty vs CEC hours** — confirm question difficulty is proportionate to the
   course's CEC weight: the 7 CEC course should feel like the hardest of the three
   (business-owner liability/compliance framing), the 5 CEC course like solid
   operator-level knowledge, the 4 CEC course like foundational recall — adjust wording
   if any course reads harder or easier than its CEC hours justify.
6. **Fill the gaps** — for `level-2-mould-remediation` specifically, the `sourceGaps`
   list names the modules with no elaborated source text (mould biology, remediation
   process sequence, PPE/containment specifics, disposal/waste classification, initial
   inspection criteria). This course's draft cannot grow past its current 10 questions
   until you supply real content for those modules — either dictate/paste the missing
   module text, or point to where it already exists, and a follow-up task will expand
   the assessment to the full 10-15 range with genuine coverage.

### Per-course approval checkbox

- [ ] `infectious-control-for-the-business-owner` — reviewed and approved (or returned
      with corrections) by the founder
- [ ] `microbe-clean-basic-understanding-course` — reviewed and approved (or returned
      with corrections) by the founder
- [ ] `level-2-mould-remediation` — reviewed and approved (or returned with
      corrections) by the founder, **and** missing module content supplied or waived

## What happens after approval

Approval of a course's draft does **not** publish anything by itself. The path from
approved draft to a live, gradeable quiz follows the same pattern as the floor-care
course (`scripts/seed-floor-care-quizzes.ts`, seeded via `npm run
db:seed-floor-care-quizzes`):

1. **Strip the review-only scaffolding.** Once a course's draft is approved, its
   `status` and `sourceGaps` fields (added for this review, not part of the production
   schema) and each question's `sourceRef` field should be considered reviewed context,
   not payload — the production seed script for this batch (modelled 1:1 on
   `seed-floor-care-quizzes.ts`) will read only `courseSlug`, `quizzes[].quizId/title/
   passPercentage/attemptsAllowed`, and `questions[].questionText/options/correctIndex/
   points`, exactly like the floor-care seeder does. No file edits are required to
   "clean" the draft — the seed script simply ignores the extra fields, the same way
   `seed-floor-care-quizzes.ts` would ignore any unrecognised key.
2. **Write the per-course seed script.** Copy
   `scripts/seed-floor-care-quizzes.ts`, point `QUIZZES_PATH` at the approved
   `data/seed/assessment-drafts/<slug>.quizzes.json`, and register an `npm run
   db:seed-<slug>-quizzes` script — same idempotent upsert-by-`quizId` pattern, same
   pre-write validation (options.length >= 2, correctIndex in range) already proven
   correct against these three draft files in this batch.
3. **Run the course catalog seed first if needed.** `npm run db:seed-courses` must
   have already created the `LmsCourse` row for the target slug (it is a live,
   published course, so this is normally already true in production) before the quiz
   seed script can resolve `courseSlug` to a course id — the seed script fails loudly
   if the course does not exist, by design.
4. **Run the quiz seed script** (`npm run db:seed-<slug>-quizzes`) against the target
   database. This creates the `LmsQuiz` + `LmsQuizQuestion` rows. It does not change
   the course's publish state.
5. **WS2c gate — founder-gated publish/unpublish.** Per the `carsi-course-production`
   skill's governance section: prod DB changes to course data go through the founder's
   authed admin session (a guarded full-echo PATCH that preserves modules, price,
   publish state, and intro video URL). Seeding the quiz rows does not itself make a
   course's quiz live to students if the lesson referencing it is gated behind a
   publish flag — confirm the WS2c publish gate/checklist before the quiz becomes
   student-visible, and treat that as a separate, explicit go/no-go step from seeding.
6. **Spot-check in the live/staging player** before declaring done: attempt the quiz as
   a student would, confirm the pass threshold (70%) and 3-attempt limit behave as
   configured, and confirm the correct answers actually score as correct (a transposed
   `correctIndex` is the single most common seed-time defect — verify it did not
   happen).

## Non-negotiables carried over from the pilot

- No question was written from the model's general knowledge — every question in
  these three files is grounded in either this course's own source text (docx module
  or WordPress description) or, where that source did not exist (`level-2-mould-
  remediation`), an explicitly cited cross-reference to a different CARSI course file
  covering the same regulatory/technical topic. Any question you cannot trace to a
  `sourceRef` should be treated as a defect, not a convenience.
- `passPercentage: 70` and `attemptsAllowed: 3` are applied uniformly across all three
  drafts per the WS2b spec — change only with an explicit founder decision, since this
  is a licence-adjacent policy choice, not a content edit.
- IICRC terminology is enforced throughout: these are "IICRC CEC courses" earning
  Continuing Education Credit, never "IICRC courses" or "IICRC certification courses".
  `npm run check:iicrc-terminology` should be run as part of any follow-up change to
  these files if that check exists in the target branch.
