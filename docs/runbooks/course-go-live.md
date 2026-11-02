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

**3. Quizzes are a separate, catalogue-wide step. Do not run it as part of a single-course
go-live.** `npm run db:seed-quizzes` (`scripts/seed-all-quizzes.ts`) has no per-course option. It
re-writes the questions of **every** quiz on its fixed `QUIZ_FILES` list in one run, and that list
does **not** include the Level 2 or Level 3 Mould quiz files. A per-course quiz seeder is an open
item (BACKLOG discoveries, 2026-11-02). Until it exists, raise any course whose quiz must go live
with Phill rather than running the all-quiz seeder.

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
| CARSI Water Restoration Practitioner | `water-damage-restoration-fundamentals` | v1 draft in the staging folder `data/courses/water-damage-restoration-fundamentals/v1-draft/` (14/14). | (1) SME clears the 21 GAP claims in its evidence ledger. (2) A promotion PR moves the course, quiz and assessment into `data/seed/`. (3) Preflight. This slug may already exist unpublished, so check `progress_rows`. (4) Seed. |
| CARSI Mould Remediation Practitioner | `mould-remediation-fundamentals` | Being rebuilt as the **designation wrapper for Level 2** (founder 2026-11-02): Level 2 is the prerequisite, and this course adds the whole-job case studies, the practical assessment and the designation exam. | Same path as the Water course. |
| WHS Fundamentals for Restoration and Cleaning Professionals | `whs-fundamentals-for-restoration-and-cleaning-professionals` | Written by an Australian registered trainer about three years ago and not updated since. | A dated currency review against current Safe Work Australia model laws and state regulators. Phill signs off the changes. Then a PR, then the seed. |

## Unlink intro videos (DECISIONS #46, 2026-11-02)

The intro videos of these 6 courses still speak an unapproved "CEC-accredited" claim. Remove them
from the live courses until they are re-rendered. This edits only `meta`, so no learner progress is
touched and no re-seed is needed.

```sql
-- 1. Read-only: confirm what is live
SELECT slug, is_published, meta->>'introVideoUrl' AS intro_video
FROM lms_courses
WHERE slug IN ('mould-remediation-fundamentals','structural-drying-fundamentals',
  'category-3-sewage-black-water-remediation','fire-smoke-damage-restoration-fundamentals',
  'trauma-crime-scene-decontamination-fundamentals','assessing-indoor-environment-conditions');

-- 2. Unlink (run inside a transaction; expect at most 6 rows)
BEGIN;
UPDATE lms_courses
SET meta = (meta::jsonb - 'introVideoUrl' - 'introCaptionsUrl')
WHERE slug IN ('mould-remediation-fundamentals','structural-drying-fundamentals',
  'category-3-sewage-black-water-remediation','fire-smoke-damage-restoration-fundamentals',
  'trauma-crime-scene-decontamination-fundamentals','assessing-indoor-environment-conditions')
  AND meta ? 'introVideoUrl';
-- check the row count, then:
COMMIT;
```

Then reload each live course page and confirm the intro video is gone. Send Phill the row counts.

## Rollback

There is no undo for the progress deletion: that is why the preflight blocks it. For everything
else, re-seed the previous version (`git checkout <previous-sha> -- data/seed/courses-catalog.json`
in a scratch checkout, then the same `--slug` command), or unpublish the course from the admin
screen.
