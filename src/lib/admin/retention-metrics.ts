import { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { ACCESS_GRANTING_STATUS_LIST } from '@/lib/server/enrollment-access';

/**
 * Learner retention, worked out from the database (Learning OS register row 4). Counts only: no
 * learner id, name or email is selected, so nothing personal can reach the admin page.
 *
 * Browser analytics cannot answer this: consent.ts never counts /dashboard pages, by design, and
 * that stays. The database already records lesson starts (`last_accessed_at`), lesson completions
 * (`completed_at`) and course completions (`lms_enrollments.completed_at`).
 *
 * Definitions, per enrolment that still grants access (refunded, disputed and revoked rows are
 * left out, the same allow-list as `isEnrolmentAccessAllowed`):
 *   - enrolled:  the enrolment exists.
 *   - activated: the learner has opened at least one lesson of that course (a progress row is
 *                written on the first visit).
 *   - returned within N days: lesson activity for that course on at least two different Sydney
 *                calendar days inside the first N days after enrolment. Only enrolments whose
 *                N-day window has fully passed are counted, in both the number and its base.
 *   - completed: the course is complete.
 *
 * "Returned" is a floor, never an over-count. A progress row keeps only its latest visit and its
 * latest completion, so earlier visits are overwritten; but every timestamp still stored is a real
 * visit, so two stored days inside the window prove a return. `enrolled_at` is set once, at
 * creation, so the window does not move.
 */
export type ReturnWindow = {
  days: number;
  /** Activated enrolments whose window has fully passed. */
  eligible: number;
  /** Of those, the ones with activity on at least two days inside the window. */
  returned: number;
};

export type RetentionMetrics = {
  enrolled: number;
  activated: number;
  returnWithin7Days: ReturnWindow;
  returnWithin30Days: ReturnWindow;
  completed: number;
};

type Row = {
  enrolled: number;
  activated: number;
  eligible_7: number;
  returned_7: number;
  eligible_30: number;
  returned_30: number;
  completed: number;
};

export async function getRetentionMetrics(asOf: Date = new Date()): Promise<RetentionMetrics> {
  const rows = await prisma.$queryRaw<Row[]>`
    WITH base AS (
      SELECT e.id, e.student_id, e.course_id, e.enrolled_at, e.completed_at
      FROM lms_enrollments e
      WHERE e.status IN (${Prisma.join([...ACCESS_GRANTING_STATUS_LIST])})
    ),
    activity AS (
      SELECT b.id AS enrolment_id, t.at
      FROM base b
      INNER JOIN lms_modules m ON m.course_id = b.course_id
      INNER JOIN lms_lessons l ON l.module_id = m.id
      INNER JOIN lms_lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = b.student_id
      CROSS JOIN LATERAL (VALUES (lp.last_accessed_at), (lp.completed_at)) AS t(at)
      WHERE t.at IS NOT NULL
    ),
    per_enrolment AS (
      SELECT
        b.enrolled_at,
        b.completed_at,
        count(a.at) > 0 AS activated,
        count(DISTINCT (a.at AT TIME ZONE 'Australia/Sydney')::date) FILTER (
          WHERE a.at >= b.enrolled_at AND a.at < b.enrolled_at + interval '7 days'
        ) AS days_7,
        count(DISTINCT (a.at AT TIME ZONE 'Australia/Sydney')::date) FILTER (
          WHERE a.at >= b.enrolled_at AND a.at < b.enrolled_at + interval '30 days'
        ) AS days_30
      FROM base b
      LEFT JOIN activity a ON a.enrolment_id = b.id
      GROUP BY b.id, b.enrolled_at, b.completed_at
    )
    SELECT
      count(*)::int AS enrolled,
      count(*) FILTER (WHERE activated)::int AS activated,
      count(*) FILTER (WHERE activated AND enrolled_at <= ${asOf}::timestamptz - interval '7 days')::int AS eligible_7,
      count(*) FILTER (WHERE activated AND enrolled_at <= ${asOf}::timestamptz - interval '7 days' AND days_7 >= 2)::int AS returned_7,
      count(*) FILTER (WHERE activated AND enrolled_at <= ${asOf}::timestamptz - interval '30 days')::int AS eligible_30,
      count(*) FILTER (WHERE activated AND enrolled_at <= ${asOf}::timestamptz - interval '30 days' AND days_30 >= 2)::int AS returned_30,
      count(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed
    FROM per_enrolment
  `;
  const r = rows[0];
  if (!r) throw new Error('retention metrics query returned no row');
  const n = (v: unknown) => Number(v);
  return {
    enrolled: n(r.enrolled),
    activated: n(r.activated),
    returnWithin7Days: { days: 7, eligible: n(r.eligible_7), returned: n(r.returned_7) },
    returnWithin30Days: { days: 30, eligible: n(r.eligible_30), returned: n(r.returned_30) },
    completed: n(r.completed),
  };
}
