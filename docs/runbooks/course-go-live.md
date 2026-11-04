# Runbook — taking one course live (per-course seed)

**Written 2026-11-02.** Audience: Rana (or whoever holds the production `DATABASE_URL`).
Agents cannot run this: no agent session holds a production database credential.

## Why this runbook exists

A merged course change does **not** reach carsi.com.au. Deploys run migrations only
(`start` = `prisma migrate deploy && next start`). Course content reaches the live site only when
someone runs the seed script against production. The live database, not the repo, is the source
of truth (`scripts/seed-courses-catalog.ts`, GP-503). The two have drifted: the live site lists
80 published courses, while `data/seed/courses-catalog.json` marks 54 as published.

## The two hazards (read before every run)

1. **A re-seed deletes learner progress.** For a course that already exists in the database, the
   script first deletes **every `lms_lesson_progress` row for that course's lessons**, then
   rebuilds the modules and lessons (`deleteCourseCurriculum`). Enrolments survive, but every
   learner's lesson completion is lost. **Never re-seed a course that has progress rows** without
   the founder's written OK.
2. **The repo copy overwrites the live copy.** The seed writes the repo's title, price, status,
   `isPublished`, description and lessons over whatever is live, including any edits made in
   production that were never brought back into the repo. Always seed **one course at a time**
   with `--slug=`, never the whole catalogue.

## Procedure (every course)

**1. Read-only preflight**, against production:

```sql
SELECT c.slug, c.title, c.status, c.is_published, c.price_aud,
       (SELECT count(*) FROM lms_enrollments e WHERE e.course_id = c.id) AS enrolments,
       (SELECT count(*) FROM lms_lesson_progress p
          JOIN lms_lessons l ON l.id = p.lesson_id
          JOIN lms_modules m ON m.id = l.module_id
         WHERE m.course_id = c.id)                                  AS progress_rows
FROM lms_courses c
WHERE c.slug = '<slug>';
```

| Result | Go? |
| --- | --- |
| No row | Safe: the seed creates the course. |
| Row with `progress_rows = 0` | Safe: nothing is lost. Check the title and price match what you expect. |
| Row with `progress_rows > 0` | **STOP.** Send the counts to Phill. Do not seed without a written OK. |

**2. Seed that one course** from an up-to-date `main` checkout:

```bash
git pull origin main
read -r -s -p 'Production DATABASE_URL: ' DATABASE_URL
printf '\n'
export DATABASE_URL
npm run db:seed-courses -- --slug=<slug>
unset DATABASE_URL
```

`read -s` takes the URL from the password manager as hidden input, so it never appears on screen
or in shell history. Never commit it or paste it into chat.

**3. Quizzes are a separate step.** Use the per-slug seeder (do **not** run bare
`npm run db:seed-quizzes` with no flags — that refuses, and `--all` rewrites every quiz on the list):

```bash
npm run db:seed-quizzes -- --slug=<slug> --dry-run   # preview
npm run db:seed-quizzes -- --slug=<slug>             # apply for that course only
```

Repo check (no DB): `npm run check:water-go-live`. After seed, live probe:
`npm run check:water-go-live:live`.

**4. Check the live page**: `https://carsi.com.au/courses/<slug>` shows the expected title,
price and module count, plus the "CARSI-issued credential, not an IICRC certification" line.
The daily Live Catalogue Licence Guard (`.github/workflows/live-catalogue-guard.yml`, 03:00 UTC)
re-checks banned branding the next morning.

**5. Tell Phill** the slug and time, and paste the preflight and seed output.

## The queue — state on 2026-11-02

| Course | Slug | State | What must happen before the seed |
| --- | --- | --- | --- |
| Level 2 — Mould Remediation | `level-2-mould-remediation-30ee3492` | **Live**, A$49. Course Standard v1, 14/14. | **Nothing. Do not re-seed.** The repo now marks it `published` to match the live site. Before this change, a re-seed would have unpublished it. Phill confirmed on 2026-11-02 that it was SME-reviewed before go-live. |
| Level 3 — Mould Remediation | `level-3-mould-remediation-c5797369` | Rebuilt draft, Course Standard v1, 14/14. **Replaces the live course at this slug** (founder 2026-11-02), at the same A$148.95. The rebuild was renamed to the live slug, so the seed updates the live row in place and keeps its id, links and enrolments. | (1) Phill's SME sign-off. Until then, **do not seed**: the repo copy is `draft`, so seeding early would unpublish the live course. (2) A PR sets `status: published`, `isPublished: true`. (3) Preflight: the old curriculum's `progress_rows` will be deleted by the seed, so send Phill the count and get a written OK. (4) Seed. |
| Ozone & Hydroxyl Generators (free sign-in course) | `ozone-and-hydroxyl-generators-what-the-evidence-says` | Draft. `meta.humanSignOff: PENDING`. Chosen 14/10/2026 as the free funnel course (DECISIONS #21). | (1) Phill's human sign-off (the course is marked `noAiRewrite`, so agents must not edit its text). (2) A PR records the sign-off and sets `published` / `isPublished: true`. (3) Seed. |
| CARSI Water Restoration Practitioner | `water-damage-restoration-fundamentals` | **Promoted, ready to seed. First course to go live (DECISIONS #48).** SME sign-off 02/11/2026 (PR #992: ledger 68 rows, 0 GAP). On 03/11/2026 the v1 course was moved into `data/seed/courses-catalog.json` as `published`, `isPublished: true`, A$99, `cecHours: 0`, Course Standard v1, 14/14. Same course `id`, so the seed updates the existing row in place. Quiz: `data/seed/water-damage-restoration-fundamentals-quiz.json` (6 module checks and a 12-question final, 48 questions, 80% pass). Practical task: `data/seed/water-damage-restoration-fundamentals-assessment.json`. The staging folder stays as the evidence record. | (1) Preflight (step 1). The slug may already exist unpublished, so check `progress_rows`; if it is above 0, stop and send Phill the counts. (2) Seed this one slug: `npm run db:seed-courses -- --slug=water-damage-restoration-fundamentals`. (3) Quiz: the seed creates quiz lessons that point at 7 quiz ids, and until those quizzes exist they will not load. Once PR #997 (per-course quiz loader) has merged, seed only this course's quizzes. First run `npm run db:seed-quizzes -- --slug=water-damage-restoration-fundamentals --dry-run` and check that it lists the 7 quizzes below. Then run the same command without `--dry-run`. If #997 has not merged, do not run `db:seed-quizzes` with no options, because it rewrites every quiz on the list (step 3). The fallback is to ask Phill to approve seeding this one file with `npm run db:seed-assessment-draft -- --file=data/seed/water-damage-restoration-fundamentals-quiz.json`, which reads only that file. Seed the course and its quiz in the same session, so learners never see quiz lessons that do not load. The final check keeps the old quiz id `e7798876-961d-4e4c-a2f0-f91ded4cc2d1`, so it is updated in place. The other 6 ids are new. (3a) Orphan-quiz check, read-only, after the quiz seed. Completing a course needs a pass on every quiz attached to it, so any quiz not in the 7 below blocks every learner. One known candidate is the retired draft `459ef333-f67e-5516-a2ed-cb2426b27916` ("CARSI Water Restoration Practitioner — Knowledge Check", 70%, from the removed `assessment-drafts` file). It exists only if someone ran `db:seed-assessment-draft --dir`. Run: `SELECT q.id, q.title, q.pass_percentage, q.created_at, (SELECT count(*) FROM lms_quiz_attempts a WHERE a.quiz_id = q.id) AS attempts FROM lms_quizzes q JOIN lms_courses c ON c.id = q.course_id WHERE c.slug = 'water-damage-restoration-fundamentals' AND q.id NOT IN ('8874f437-a8ad-4c2c-bcdb-6dbf36c108a0','9860fee3-daf0-4007-92b7-93229547a9d8','618e4230-aa48-4ed6-977b-2389f20971e2','eb442750-ac7a-4baf-bac4-fd6db0f7f30c','ed90b217-493e-4dc0-93ac-87e51e86451c','6220f5b8-3191-4701-8811-b1714153388b','e7798876-961d-4e4c-a2f0-f91ded4cc2d1');`. If it returns no rows, carry on. If it returns rows, **do not publish-check or announce the course**. Send Phill the rows. Removing a quiz is a delete that no script performs, so it needs his written OK first. (4) Practical task: no script seeds it (`seed-ccw-truckmount-assessment.ts` reads only the CCW file). Enter it in the admin practical-assessment screen from the JSON, or leave it for a later seeder. (5) Check the live page (step 4). |
| CARSI Mould Remediation Practitioner | `mould-remediation-fundamentals` | Being rebuilt as the **designation wrapper for Level 2** (founder 2026-11-02): Level 2 is the prerequisite, and this course adds the whole-job case studies, the practical assessment and the designation exam. | Same path as the Water course. |
| WHS Fundamentals for Restoration and Cleaning Professionals | `whs-fundamentals-for-restoration-and-cleaning-professionals` | Written by an Australian registered trainer about three years ago and not updated since. | A dated currency review against current Safe Work Australia model laws and state regulators. Phill signs off the changes. Then a PR, then the seed. |

## Unlink intro videos (DECISIONS #46, 2026-11-02)

The intro videos of these 6 courses still speak an unapproved "CEC-accredited" claim. Remove them
from the live courses until they are re-rendered. This edits only `meta`, so no learner progress is
touched and no re-seed is needed.

```sql
-- 1. Read-only: confirm what is live
SELECT slug, is_published,
       meta->>'introVideoUrl'    AS intro_video,
       meta->>'introCaptionsUrl' AS intro_captions
FROM lms_courses
WHERE slug IN ('mould-remediation-fundamentals','structural-drying-fundamentals',
  'category-3-sewage-black-water-remediation','fire-smoke-damage-restoration-fundamentals',
  'trauma-crime-scene-decontamination-fundamentals','assessing-indoor-environment-conditions');
```

Run the update in its own transaction, one statement at a time, so you can check the count
before anything is saved:

```sql
BEGIN;
UPDATE lms_courses
SET meta = (meta::jsonb - 'introVideoUrl' - 'introCaptionsUrl')
WHERE slug IN ('mould-remediation-fundamentals','structural-drying-fundamentals',
  'category-3-sewage-black-water-remediation','fire-smoke-damage-restoration-fundamentals',
  'trauma-crime-scene-decontamination-fundamentals','assessing-indoor-environment-conditions')
  AND (meta::jsonb ? 'introVideoUrl' OR meta::jsonb ? 'introCaptionsUrl');
```

Check the reported count (`UPDATE n`). It must match the rows in step 1 that had a video or
captions value, and never exceed 6. If it matches, run `COMMIT;`. If not, run `ROLLBACK;` and send
Phill the step 1 output.

Then reload each live course page and confirm the intro video is gone. Send Phill the row counts.

## Rollback

There is no undo for the progress deletion: that is why the preflight blocks it. For everything
else, re-seed the previous version (`git checkout <previous-sha> -- data/seed/courses-catalog.json`
in a scratch checkout, then the same `--slug` command), or unpublish the course from the admin
screen.
