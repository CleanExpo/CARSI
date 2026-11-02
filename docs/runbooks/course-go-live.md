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
DATABASE_URL="<production URL from the password manager>" \
  npm run db:seed-courses -- --slug=<slug>
```

Type the URL from the password manager into the prompt only. Never commit it, paste it into chat,
or leave it in shell history.

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
| Level 2 — Mould Remediation | `level-2-mould-remediation-30ee3492` | **Live**, A$49. Course Standard v1, 14/14. | **Nothing. Do not re-seed.** The repo now marks it `published` to match the live site. Before this change, a re-seed would have unpublished it. Its metadata still reads `pilot-rebuild-pending-sme-review`. Phill: confirm whether SME review happened. |
| Level 3 — Mould Remediation | `level-3-mould-remediation-6c55a1ef` | Draft, Course Standard v1, 14/14. | (1) SME sign-off. (2) **Phill decides:** replace the live `level-3-mould-remediation-c5797369` (A$148.95), or sit beside it. The price is a placeholder. (3) A PR sets `status: published`, `isPublished: true`. (4) Seed. |
| Ozone & Hydroxyl Generators (free sign-in course) | `ozone-and-hydroxyl-generators-what-the-evidence-says` | Draft. `meta.humanSignOff: PENDING`. Chosen 14/10/2026 as the free funnel course (DECISIONS #21). | (1) Phill's human sign-off (the course is marked `noAiRewrite`, so agents must not edit its text). (2) A PR records the sign-off and sets `published` / `isPublished: true`. (3) Seed. |
| CARSI Water Restoration Practitioner | `water-damage-restoration-fundamentals` | v1 draft in the staging folder `data/courses/water-damage-restoration-fundamentals/v1-draft/` (14/14). | (1) SME clears the 21 GAP claims in its evidence ledger. (2) A promotion PR moves the course, quiz and assessment into `data/seed/`. (3) Preflight. This slug may already exist unpublished, so check `progress_rows`. (4) Seed. |
| CARSI Mould Remediation Practitioner | `mould-remediation-fundamentals` | v1 draft being built (Course Standard v1 rebuild, 2026-11-02). | Same path as the Water course. |

## Rollback

There is no undo for the progress deletion: that is why the preflight blocks it. For everything
else, re-seed the previous version (`git checkout <previous-sha> -- data/seed/courses-catalog.json`
in a scratch checkout, then the same `--slug` command), or unpublish the course from the admin
screen.
