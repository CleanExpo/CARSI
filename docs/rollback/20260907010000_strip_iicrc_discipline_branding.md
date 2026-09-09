# Rollback — `20260907010000_strip_iicrc_discipline_branding`

Prisma has no down-migrations, so this file plus the capture beside it **is** the rollback.
It exists because UG-AUTONOMY-001 forbids an irreversible production action without a tested
one, and because a rollback nobody has looked at is not a rollback.

## What the migration changed

35 rows in `lms_courses`, all keyed on `slug`:

| Change | Rows |
|---|---|
| `title` — removed a trailing `(XXX-aligned)` | 4 |
| `description` + `short_description` — removed `WRT-aligned` phrasing | 1 |
| `iicrc_discipline` — set to `NULL` | 35 |

Prior `iicrc_discipline` values, as they stood in production on 2026-09-06:
`WRT` (12), `ASD` (9), `AMRT` (5), `CCT` (4), `FSRT` (2), `WRT / ASD` (2), `OCT` (1).

Nothing else was touched. In particular **`cec_hours` was not modified on any row** — all 27
live CEC claims were cross-checked against `data/seed/cec-approvals.json` and 27 of 27 are
backed by an approved entry with matching hours.

## The capture

`20260907010000_strip_iicrc_discipline_branding-capture.json` holds, for each of the 35 rows,
the `id`, `slug`, and the complete `before` and `after` values of every field the migration
touches. It was read from `https://www.carsi.com.au/api/lms/courses/<slug>` at
`2026-09-06T09:54:30.109Z`, reaching 80 of 80 live courses with 0 unreachable — before any
change was applied. That "80 of 80" matters: a capture that had silently reached only some
courses would produce a rollback that silently restores only some of them.

## How to reverse

For each object in the capture's `rows` array, write its `before` values back to the row with
that `slug`. Do it through the same path the migration used — a new Prisma migration on a
branch, reviewed, receipted — not by hand against production. The whole reason this defect
persisted for weeks is that production course data was only reachable outside the repo, and
reversing it outside the repo would recreate that problem rather than fix it.

If reversal is ever needed urgently, the capture is the authoritative record of what to restore;
the migration file itself records what each value became.

## What reversing would restore

Reversing puts banned IICRC discipline branding back on 35 live courses, including the
`IICRC <acronym>` badge rendered to signed-in students at
`app/(dashboard)/dashboard/courses/[slug]/page.tsx:76`. That is a licence-critical state under
the founder ruling of 2026-07-10 recorded in `CLAUDE.md`. Reverse only to recover from a
defect introduced by the migration itself — never to restore the old branding on purpose.
