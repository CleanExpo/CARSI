import { Prisma } from '@/generated/prisma/client';

import { ACCESS_GRANTING_STATUS_LIST } from '@/lib/server/enrollment-access';

/**
 * The one XP eligibility rule (Learning OS register row 2). Every XP, leaderboard and streak query
 * reads it from here; none restates it.
 *
 * A completion earns XP only while
 *   - the learner's enrolment on that course still grants access: the same allow-list as
 *     `isEnrolmentAccessAllowed` (`active`, `completed`), so a refund, dispute or revocation
 *     removes the XP and any unknown status fails closed. Like that check, the status is compared
 *     lower-cased and trimmed of every kind of whitespace, tabs and newlines included (PostgreSQL `trim` strips only spaces, so the rule uses `regexp_replace`): rows written before the ws6 status constraint were never validated
 *     and may read `Active` or ` completed`, and a learner who can open the course must also earn
 *     its XP (GP-786); and
 *   - the course is published: `status` is canonical (#137), compared case-insensitively and
 *     untrimmed, the same answer as `isPublishedCourseStatus`.
 *
 * Lesson progress with no enrolment behind it earns nothing: every progress writer runs under an
 * enrolment, so such a row is orphaned or legacy data.
 *
 * Callers select FROM one of the two sources below, which fix the aliases the rule uses
 * (`e` = lms_enrollments, `c` = lms_courses).
 */
export const SQL_XP_ELIGIBLE = Prisma.sql`lower(regexp_replace(e.status, '^[[:space:]]+|[[:space:]]+$', '', 'g')) IN (${Prisma.join(
  [...ACCESS_GRANTING_STATUS_LIST]
)}) AND lower(c.status) = 'published'`;

/** Lesson completions, joined to their course and to the learner's enrolment on it. */
export const SQL_XP_LESSON_SOURCE = Prisma.sql`lms_lesson_progress lp
      INNER JOIN lms_lessons l ON l.id = lp.lesson_id
      INNER JOIN lms_modules m ON m.id = l.module_id
      INNER JOIN lms_courses c ON c.id = m.course_id
      INNER JOIN lms_enrollments e ON e.student_id = lp.student_id AND e.course_id = c.id`;

/** Course completions (one enrolment row per learner and course). */
export const SQL_XP_COURSE_SOURCE = Prisma.sql`lms_enrollments e
      INNER JOIN lms_courses c ON c.id = e.course_id`;
