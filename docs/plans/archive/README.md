# Archived plans — records, not instructions

**Do not update anything in this directory to make it current.** These are point-in-time plans.
Their value is that they say what was intended on the date they were written. Editing them to
match today's code destroys the only thing they are for, and a plan that has been quietly
retrofitted is worse than no plan at all.

## Why this directory exists

Archived 2026-08-26 during a markdown audit of all 316 `.md` files in the repo. The corpus is
**69,488 lines**, and these eight files were **8,143 of them** — around 12% of everything — all
last touched 2026-06-25 and all describing work either shipped long ago or abandoned.

They were not marked as historical, so every currency check treated them as live documents that
had gone eight weeks without maintenance. That buried the genuinely stale live docs in noise. The
fix was to file them as what they are rather than to rewrite them.

## What is in here

| File | Lines |
| --- | --- |
| `2026-03-04-gamification-subscription-iicrc-plan.md` | 3003 |
| `2026-03-03-carsi-enhancements-plan.md` | 1719 |
| `2026-03-03-carsi-lms-rebuild.md` | 1400 |
| `2026-03-06-student-credentials-notes.md` | 1296 |
| `2026-03-03-carsi-lms-enhancements-design.md`, `2026-03-04-gamification-subscription-iicrc-design.md`, `2026-03-06-governance-framework.md`, `2026-03-06-student-pages-design.md` | the remainder |
| `2026-06-22-ccw-roadshow-registry-caps.md` (added 2026-08-26, from `docs/superpowers/plans/`) | 1787 |

Moved with `git mv`, so `git log --follow <file>` still reaches their full history. Verified at
the time: all staged as renames (`R`), not delete-plus-add.

## Its checkboxes lie — read the code, not the ticks

`2026-06-22-ccw-roadshow-registry-caps.md` contains **44 unchecked boxes and 0 ticked ones**. It
is nonetheless **implemented**. Nobody ticked them, and the plan was archived on code evidence
rather than on its own tracking:

- `prisma/schema.prisma:914` and `:968` define `CcwRoadshowRegistration` and `CcwRoadshowAttendee`,
  the two tables the plan specifies;
- the admin view, waitlist handling and CSV export are in `AdminCcwRoadshowClient.tsx`;
- the booking surface is `CcwRoadshowBooking.tsx`, calendar sync is
  `src/lib/marketing/ccw-roadshow-calendar-links.ts`;
- five CCW test files exist under `src/lib/marketing/` and `src/components/admin/`;
- the per-city caps have since moved **past** the plan's stated Melbourne 10 / Sydney 12, so the
  document has been overtaken by operations as well as completed.

**Do not read those 44 boxes as 44 outstanding tasks.** This is the same trap that made BACKLOG
rows 10 and 11 look unstarted when both were built and one was running daily in production. A
tracking artifact is not evidence about the code; only the code is.

## Expect them to describe a stack that no longer exists

These plans predate the architecture pivot. They refer to Fly.io, a separate Python backend,
Railway, `apps/` workspaces and `pnpm`. None of that is in this repo now — production is the
DigitalOcean App Platform app `monkfish-app`, defined by `app.yaml` with
`dockerfile_path: deploy/Dockerfile`. That mismatch is **correct** for an archived plan and must
not be "fixed" here.

## Where the live material is

- Current plans: `docs/plans/` (7 files remain there).
- What is actually being worked: `BACKLOG.md`, then `GOAL.md` and `DECISIONS.md`.
- How a session runs the queue: `SPEC.md`.

## The rule for future sessions

When a plan is finished or abandoned, move it here rather than leaving it in `docs/plans/`.
A plan in `docs/plans/` is a claim that it still guides work.
