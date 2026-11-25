/**
 * XP eligibility on a REAL PostgreSQL (Learning OS register row 2, first half).
 *
 * A refunded or revoked learner, a learner on a course that is no longer published, and lesson
 * progress with no enrolment behind it must earn no XP (lesson, course or streak day) and must not
 * appear on the monthly leaderboard. An active or completed enrolment on a published course still
 * earns XP and ranks: that is the positive control, so an empty board cannot pass by accident.
 *
 * Runs the real XP code (real Prisma, real SQL) against CI's migrated postgres:16 service
 * (`npm run test:pg`). Every assertion is scoped to rows this file creates, and afterAll deletes
 * them, so the database is left as it was found.
 */
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

if (!RUNNABLE) {
  describe('XP eligibility (real PostgreSQL)', () => {
    const refusal = TARGET.refusal;
    if (refusal) {
      it('refuses: needs a disposable loopback DATABASE_URL (CARSI_PG_DISPOSABLE=1)', () => {
        throw new Error(refusal);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('XP eligibility (real PostgreSQL)', () => {
  const db = new pg.Client({ connectionString: DB_URL });
  let prisma: typeof import('@/lib/prisma').prisma;
  let xp: typeof import('./leaderboard-xp');
  let learnerXp: typeof import('./learner-xp');

  const ids = {
    instructor: randomUUID(),
    /** status 'completed' on a published course: earns XP (positive control). */
    counted: randomUUID(),
    /** refunded: status 'revoked', but its completion timestamps survived. */
    revoked: randomUUID(),
    /** legacy status ' Completed ' (mixed case, padded): access is allowed, so XP is too (GP-786). */
    padded: randomUUID(),
    /** legacy status ' REVOKED ' (mixed case, padded): still no access and no XP. */
    paddedRevoked: randomUUID(),
    /** active enrolment on a course that is no longer published. */
    unpublished: randomUUID(),
    /** lesson progress on the published course with no enrolment row at all. */
    orphan: randomUUID(),
    /** one lesson on the published course (counts) plus a whole draft course (does not). */
    mixed: randomUUID(),
    published: randomUUID(),
    draft: randomUUID(),
    publishedModule: randomUUID(),
    draftModule: randomUUID(),
    p1: randomUUID(),
    p2: randomUUID(),
    d1: randomUUID(),
  };
  const learners = [
    ids.counted,
    ids.revoked,
    ids.padded,
    ids.paddedRevoked,
    ids.unpublished,
    ids.orphan,
    ids.mixed,
  ];
  const publishedSlug = `xp-elig-pub-${ids.published}`;
  const draftSlug = `xp-elig-draft-${ids.draft}`;

  async function enrol(student: string, course: string, status: string) {
    await db.query(
      'INSERT INTO lms_enrollments (id, student_id, course_id, status, completed_at) VALUES ($1, $2, $3, $4, now())',
      [randomUUID(), student, course, status]
    );
  }
  /**
   * A legacy enrolment row with a non-canonical status. New writes cannot make one: the
   * `lms_enrollments_status_check` constraint (ws6, NOT VALID) refuses them, but rows written
   * before it were never validated and may still carry `Active` or ` completed`. The constraint is
   * dropped and re-added with its own definition inside one transaction, which recreates exactly
   * that state (GP-786).
   */
  async function enrolLegacy(student: string, course: string, status: string) {
    const def = await db.query<{ def: string }>(
      "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'lms_enrollments_status_check'"
    );
    const constraint = def.rows[0]?.def;
    if (!constraint) throw new Error('lms_enrollments_status_check is missing');
    await db.query('BEGIN');
    try {
      await db.query('ALTER TABLE lms_enrollments DROP CONSTRAINT lms_enrollments_status_check');
      await enrol(student, course, status);
      await db.query(
        `ALTER TABLE lms_enrollments ADD CONSTRAINT lms_enrollments_status_check ${constraint}`
      );
      await db.query('COMMIT');
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  }
  async function complete(student: string, lesson: string) {
    await db.query(
      'INSERT INTO lms_lesson_progress (id, student_id, lesson_id, completed, completed_at, last_accessed_at) VALUES ($1, $2, $3, true, now(), now())',
      [randomUUID(), student, lesson]
    );
  }

  beforeAll(async () => {
    await db.connect();
    const users = [ids.instructor, ...learners];
    for (const id of users) {
      await db.query(
        "INSERT INTO lms_users (id, email, hashed_password, role, leaderboard_show_display_name) VALUES ($1, $2, 'x', NULL, true)",
        [id, `xp-elig-${id}@xp-test.invalid`]
      );
    }
    await db.query(
      "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud) VALUES ($1, $2, 'XP published', $3, 'Published', 0), ($4, $5, 'XP draft', $3, 'draft', 0)",
      [ids.published, publishedSlug, ids.instructor, ids.draft, draftSlug]
    );
    await db.query(
      "INSERT INTO lms_modules (id, course_id, title, order_index) VALUES ($1, $2, 'M', 0), ($3, $4, 'M', 0)",
      [ids.publishedModule, ids.published, ids.draftModule, ids.draft]
    );
    await db.query(
      "INSERT INTO lms_lessons (id, module_id, title, content_type, order_index) VALUES ($1, $2, 'L1', 'text', 0), ($3, $2, 'L2', 'text', 1), ($4, $5, 'D1', 'text', 0)",
      [ids.p1, ids.publishedModule, ids.p2, ids.d1, ids.draftModule]
    );

    await enrol(ids.counted, ids.published, 'completed');
    await complete(ids.counted, ids.p1);
    await complete(ids.counted, ids.p2);

    await enrol(ids.revoked, ids.published, 'revoked');
    await complete(ids.revoked, ids.p1);
    await complete(ids.revoked, ids.p2);

    await enrolLegacy(ids.padded, ids.published, ' Completed ');
    await complete(ids.padded, ids.p1);
    await complete(ids.padded, ids.p2);

    await enrolLegacy(ids.paddedRevoked, ids.published, ' REVOKED ');
    await complete(ids.paddedRevoked, ids.p1);

    await enrol(ids.unpublished, ids.draft, 'active');
    await complete(ids.unpublished, ids.d1);

    await complete(ids.orphan, ids.p1);

    await db.query(
      "INSERT INTO lms_enrollments (id, student_id, course_id, status) VALUES ($1, $2, $3, 'active')",
      [randomUUID(), ids.mixed, ids.published]
    );
    await complete(ids.mixed, ids.p1);
    await enrol(ids.mixed, ids.draft, 'active');
    await complete(ids.mixed, ids.d1);

    ({ prisma } = await import('@/lib/prisma'));
    xp = await import('./leaderboard-xp');
    learnerXp = await import('./learner-xp');
  });

  afterAll(async () => {
    // Courses cascade to modules, lessons and enrolments; users cascade to progress.
    await db.query('DELETE FROM lms_courses WHERE id = ANY($1::uuid[])', [
      [ids.published, ids.draft],
    ]);
    await db.query('DELETE FROM lms_users WHERE id = ANY($1::uuid[])', [
      [ids.instructor, ...learners],
    ]);
    await db.end().catch(() => {});
    await prisma?.$disconnect().catch(() => {});
  });

  it('counts XP only for eligible enrolments on published courses (lifetime)', async () => {
    const totals = xp.mergeXpMaps(
      await xp.lessonXpGrouped(null, null, null),
      await xp.courseXpGrouped(null, null, null)
    );
    expect(totals.get(ids.counted)).toBe(2 * xp.XP_LESSON_COMPLETE + xp.XP_COURSE_COMPLETE);
    expect(totals.get(ids.mixed)).toBe(xp.XP_LESSON_COMPLETE);
    expect(totals.get(ids.padded)).toBe(2 * xp.XP_LESSON_COMPLETE + xp.XP_COURSE_COMPLETE);
    expect(totals.get(ids.revoked) ?? 0).toBe(0);
    expect(totals.get(ids.paddedRevoked) ?? 0).toBe(0);
    expect(totals.get(ids.unpublished) ?? 0).toBe(0);
    expect(totals.get(ids.orphan) ?? 0).toBe(0);
  });

  it('applies the same rule when filtered to a course and to the current month', async () => {
    const bounds = await prisma.$queryRaw<{ start: Date; end: Date }[]>`
      SELECT now() - interval '1 day' AS start, now() + interval '1 day' AS end`;
    const { start, end } = bounds[0]!;
    for (const slugs of [[publishedSlug, draftSlug], null] as const) {
      const lesson = await xp.lessonXpGrouped(start, end, slugs);
      const course = await xp.courseXpGrouped(start, end, slugs);
      expect(lesson.get(ids.counted)).toBe(2 * xp.XP_LESSON_COMPLETE);
      expect(course.get(ids.counted)).toBe(xp.XP_COURSE_COMPLETE);
      for (const id of [ids.revoked, ids.unpublished, ids.orphan]) {
        expect(lesson.get(id) ?? 0).toBe(0);
        expect(course.get(id) ?? 0).toBe(0);
      }
    }
    const lessonBySlug = await xp.lessonXpGrouped(null, null, [publishedSlug, draftSlug]);
    expect(lessonBySlug.get(ids.revoked) ?? 0).toBe(0);
    expect(lessonBySlug.get(ids.mixed)).toBe(xp.XP_LESSON_COMPLETE);
  });

  it('keeps ineligible learners off the monthly leaderboard and ranks the eligible ones', async () => {
    const board = await xp.getMonthlyLeaderboard({ courseSlugs: null, limit: 10_000 });
    const labels = new Set(board.items.map((i) => i.display_name));
    expect(labels.has(xp.anonymousLeaderboardLabel(ids.counted))).toBe(true);
    expect(labels.has(xp.anonymousLeaderboardLabel(ids.mixed))).toBe(true);
    expect(labels.has(xp.anonymousLeaderboardLabel(ids.padded))).toBe(true);
    for (const id of [ids.revoked, ids.paddedRevoked, ids.unpublished, ids.orphan]) {
      expect(labels.has(xp.anonymousLeaderboardLabel(id))).toBe(false);
    }
  });

  it('gives an ineligible learner no XP and no streak day on their own level card', async () => {
    const counted = await learnerXp.getLearnerLevelPayload(ids.counted);
    expect(counted.total_xp).toBe(2 * xp.XP_LESSON_COMPLETE + xp.XP_COURSE_COMPLETE);
    expect(counted.current_streak).toBe(1);
    const padded = await learnerXp.getLearnerLevelPayload(ids.padded);
    expect(padded.total_xp).toBe(2 * xp.XP_LESSON_COMPLETE + xp.XP_COURSE_COMPLETE);
    expect(padded.current_streak).toBe(1);
    for (const id of [ids.revoked, ids.paddedRevoked, ids.unpublished, ids.orphan]) {
      const p = await learnerXp.getLearnerLevelPayload(id);
      expect(p.total_xp).toBe(0);
      expect(p.current_streak).toBe(0);
      expect(p.longest_streak).toBe(0);
    }
  });
});
