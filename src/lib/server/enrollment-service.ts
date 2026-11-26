import { randomUUID } from 'node:crypto';

import type { Prisma } from '@/generated/prisma/client';
import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { mergeLessonInteractivePilots } from '@/lib/lms/append-interactive-pilot';
import {
  isAdminOverridePaymentReference,
  isStripeCheckoutPaymentReference,
} from '@/lib/lms/course-prerequisites';
import {
  isInteractiveExperienceComplete,
  parseInteractiveProgressDocument,
} from '@/lib/lms/interactive-progress-store';
import { isInteractiveLessonResource, parseLessonResources } from '@/lib/lms/lesson-resources';
import { extractQuizIdFromLesson } from '@/lib/lms/quiz-from-lesson';
import { prisma } from '@/lib/prisma';
import {
  isAdminClaims,
  isCohortOnlyCourse,
  isInstructorClaims,
  mayIssueEnrolment,
  shouldStaffAutoEnrol,
} from '@/lib/server/carsi-workshop-access';
import { getOrCreateCourseBySlug } from '@/lib/server/course-catalog-sync';
import { resolveLmsCourseCecHours } from '@/lib/server/course-cec-hours';
import {
  findCoursePrerequisiteBlock,
  PrerequisiteNotMetError,
} from '@/lib/server/course-prerequisites';
import { requireCurrentAdmin, type AdminSessionProvenance } from '@/lib/server/current-admin';
import { isUniqueConstraintError } from '@/lib/server/db-errors';
import { isEnrolmentAccessAllowed, isRevokedStatus } from '@/lib/server/enrollment-access';
import { EnrollmentLockRefusal, withLockedEnrollment } from '@/lib/server/enrollment-row-lock';
import { decideEnrollmentCompleted } from '@/lib/server/lms-completion';
import { ensureLmsUserFromClaims } from '@/lib/server/lms-user-sync';

/**
 * Assessment gate for completion: the ONE rule for "has this learner passed every required
 * assessment of this course" (Phase 6, 2026-06-29 audit; GP-432).
 *  - every quiz in the course has a passing attempt by the learner;
 *  - every PUBLISHED practical assessment has a submission reviewed as 'passed';
 *  - a course approved for IICRC CECs (the approvals registry, GP-498) must HAVE at least
 *    one assessment: a CEC certificate is never issued on lessons alone (GP-432). A course
 *    with no CEC approval and no assessment completes on lessons, and claims no CEC.
 */
async function requiredAssessmentsPassed(
  db: Prisma.TransactionClient,
  courseId: string,
  courseSlug: string | null,
  studentId: string
): Promise<boolean> {
  const [quizzes, practicals] = await Promise.all([
    db.lmsQuiz.findMany({ where: { courseId }, select: { id: true } }),
    db.lmsPracticalAssessment.findMany({
      where: { courseId, isPublished: true },
      select: { id: true },
    }),
  ]);
  const quizIds = quizzes.map((q) => q.id);
  const practicalIds = practicals.map((p) => p.id);

  if (quizIds.length === 0 && practicalIds.length === 0) {
    return courseSlug == null ? false : resolveLmsCourseCecHours({ slug: courseSlug }) == null;
  }

  if (quizIds.length > 0) {
    const passed = await db.lmsQuizAttempt.findMany({
      where: { quizId: { in: quizIds }, studentId, passed: true },
      select: { quizId: true },
      distinct: ['quizId'],
    });
    if (new Set(passed.map((p) => p.quizId)).size < quizIds.length) return false;
  }

  if (practicalIds.length > 0) {
    const passed = await db.lmsAssessmentSubmission.findMany({
      where: { assessmentId: { in: practicalIds }, studentId, status: 'passed' },
      select: { assessmentId: true },
      distinct: ['assessmentId'],
    });
    if (new Set(passed.map((p) => p.assessmentId)).size < practicalIds.length) return false;
  }

  return true;
}

/**
 * Thrown when a learner asks to mark a lesson complete and the server holds no evidence for
 * it (GP-432). Today the only lesson type with server-checked evidence is a quiz lesson (or a
 * lesson whose resources attach a quiz): it needs a passing attempt, graded on the server.
 */
export class LessonCompletionEvidenceError extends Error {
  constructor(public readonly code: 'QUIZ_NOT_PASSED' | 'INTERACTIVE_NOT_COMPLETE') {
    super(
      code === 'QUIZ_NOT_PASSED'
        ? 'Pass the quiz to complete this lesson.'
        : 'Complete the interactive practice to mark this lesson done.'
    );
    this.name = 'LessonCompletionEvidenceError';
  }
}

/**
 * Server evidence a lesson may be marked complete by the learner (GP-432):
 *  - quiz lesson, or any lesson whose resources attach a quiz: a passing attempt on that quiz;
 *  - interactive lesson resources (including merged pilots): all activities complete in
 *    `interactive_progress` on the server;
 *  - reading, video and file lessons: the lesson model records nothing the server can check
 *    (video position is reported by the browser, durationMinutes is usually null and embedded
 *    video saves nothing), so the learner's mark stands. Such lessons cannot by themselves
 *    complete a course that needs an assessment: requiredAssessmentsPassed decides that.
 */
async function assertLessonCompletionEvidence(
  db: Prisma.TransactionClient,
  studentId: string,
  lessonId: string
): Promise<void> {
  const lesson = await db.lmsLesson.findUnique({
    where: { id: lessonId },
    select: {
      contentType: true,
      contentBody: true,
      resources: true,
      module: { select: { course: { select: { slug: true } } } },
    },
  });
  if (!lesson) return;
  const mergedResources = mergeLessonInteractivePilots(
    lesson.module.course.slug,
    lessonId,
    parseLessonResources(lesson.resources)
  );
  const quizId = extractQuizIdFromLesson(lesson.contentType, lesson.contentBody, mergedResources);
  if (quizId) {
    const passed = await db.lmsQuizAttempt.findFirst({
      where: { quizId, studentId, passed: true },
      select: { id: true },
    });
    if (!passed) throw new LessonCompletionEvidenceError('QUIZ_NOT_PASSED');
  }

  const interactiveResources = mergedResources.filter(isInteractiveLessonResource);
  if (interactiveResources.length === 0) return;

  const progressRow = await db.lmsLessonProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
    select: { interactiveProgress: true },
  });
  const progressDoc = parseInteractiveProgressDocument(progressRow?.interactiveProgress);

  for (const resource of interactiveResources) {
    const { experience } = resource;
    const snapshot = progressDoc[experience.id] ?? null;
    if (!isInteractiveExperienceComplete(experience, snapshot)) {
      throw new LessonCompletionEvidenceError('INTERACTIVE_NOT_COMPLETE');
    }
  }
}

export type EnrollResult = 'already_enrolled' | { enrollmentId: string; courseId: string };

export type EnrollOptions = {
  /**
   * What to do when the learner has NOT met the course prerequisite (DECISIONS #41):
   *  - 'refuse' (default): throw `PrerequisiteNotMetError`; no enrolment is issued;
   *  - 'lock': issue the enrolment with `prerequisiteGated = true`, so the course stays
   *    locked for this learner until they complete the prerequisite. Used for TEAM seats
   *    (founder decision 02/11/2026: anyone may buy seats; each member's seat stays locked).
   * A Stripe-paid fulfilment (`cs_*`) always behaves as 'lock': the money is already taken.
   */
  onPrerequisiteNotMet?: 'refuse' | 'lock';
  /**
   * The caller makes the learner's user row itself, in the transaction that writes the
   * enrolment (GP-795: a new team member's account is made with their seat, so a refused seat
   * leaves no account). The reading half then does not upsert the row. Only `prepareNewMemberSeat`
   * sets it.
   */
  userWrittenByCaller?: boolean;
};

/**
 * GP-759 (Phill, 23/11/2026): a Stripe checkout session (`cs_*`) and a team seat (`team:*`) are
 * session and seat state. They are issued only inside the one serialisable seat step
 * (`seat-state.ts`), which checks the session's reversal and the team's paid seats in the same
 * transaction as the write. This writer refuses them so no route can issue one around the step.
 */
export function isSeatStatePaymentReference(paymentReference: string): boolean {
  const ref = paymentReference.trim();
  return ref.startsWith('cs_') || ref.startsWith('team:');
}

export async function enrollStudentInCourse(
  claims: SessionClaims,
  slug: string,
  paymentReference: string,
  options: EnrollOptions = {}
): Promise<EnrollResult> {
  if (isSeatStatePaymentReference(paymentReference)) {
    throw new Error('SEAT_STATE_OUTSIDE_STEP');
  }
  const prepared = await prepareEnrolment(claims, slug, paymentReference, options);
  return writeEnrolmentRow(prisma, prepared, { swallowUniqueClash: true });
}

/** An enrolment made ready outside a transaction; written by `issuePreparedEnrolment`. */
export type PreparedEnrolment = {
  studentId: string;
  courseId: string;
  paymentReference: string;
  /** `prerequisiteGated` to store if this write issues access. */
  prerequisiteGated: boolean;
  /** Set when the prerequisite refuses a NEW enrolment; thrown only if the write would issue. */
  refusal: PrerequisiteNotMetError | null;
};

/**
 * The reading half of an enrolment: learner sync, course, cohort-only rule (GP-736) and the
 * prerequisite decision. Reads and idempotent syncs only, so a caller can do this before it opens
 * a transaction and then write with `issuePreparedEnrolment` inside it.
 */
export async function prepareEnrolment(
  claims: SessionClaims,
  slug: string,
  paymentReference: string,
  options: EnrollOptions = {}
): Promise<PreparedEnrolment> {
  if (!options.userWrittenByCaller) await ensureLmsUserFromClaims(claims);
  const course = await getOrCreateCourseBySlug(slug);

  // Cohort-only courses (the CARSI roadshow workshop): learners enter only through the
  // attendance check-in or an admin. Refused here, in the shared writer, so no free-confirm,
  // membership, team or Stripe route can issue or reactivate one (GP-736 review, P0).
  if (!mayIssueEnrolment(course.slug ?? slug, paymentReference)) {
    throw new Error('COURSE_NOT_SELF_ENROLABLE');
  }

  let prerequisiteGated = false;
  let refusal: PrerequisiteNotMetError | null = null;
  try {
    prerequisiteGated = await checkPrerequisitesForNewEnrolment(
      claims,
      course,
      paymentReference,
      options.onPrerequisiteNotMet ?? 'refuse'
    );
  } catch (e) {
    if (!(e instanceof PrerequisiteNotMetError)) throw e;
    refusal = e;
  }
  return {
    studentId: claims.sub,
    courseId: course.id,
    paymentReference,
    prerequisiteGated,
    refusal,
  };
}

/**
 * Writes a prepared enrolment with the caller's transaction client (the seat step). Inside a
 * transaction a unique-key clash is not swallowed: Postgres has already aborted it.
 */
export function issuePreparedEnrolment(
  db: Prisma.TransactionClient,
  prepared: PreparedEnrolment
): Promise<EnrollResult> {
  return writeEnrolmentRow(db, prepared, { swallowUniqueClash: false });
}

/** The one writer of an enrolment row: issue, reactivate a revoked row, or report a duplicate. */
async function writeEnrolmentRow(
  db: Prisma.TransactionClient | typeof prisma,
  prepared: PreparedEnrolment,
  { swallowUniqueClash }: { swallowUniqueClash: boolean }
): Promise<EnrollResult> {
  const { studentId, paymentReference } = prepared;
  const course = { id: prepared.courseId };
  const existing = await db.lmsEnrollment.findUnique({
    where: {
      studentId_courseId: { studentId, courseId: course.id },
    },
    select: { id: true, status: true },
  });

  // Prerequisite gate (DECISIONS #41) — applied only when an enrolment is ISSUED (a new
  // row, or a row without access being (re)activated). An existing active/completed row is
  // grandfathered and returns 'already_enrolled' below without a re-check. "Has access" is
  // the access rule's own answer (`isEnrolmentAccessAllowed`), never restated here: a pending
  // or unrecognised row gives no access, so it is issued over, not reported as a duplicate
  // (GP-759 follow-up, Codex round 1).
  const issues = !existing || !isEnrolmentAccessAllowed(existing.status);
  let prerequisiteGated = false;
  if (issues) {
    if (prepared.refusal) throw prepared.refusal;
    prerequisiteGated = prepared.prerequisiteGated;
  }

  if (existing) {
    // Re-purchase after a refund (WS3 / P0-C): a revoked enrolment MUST be
    // reactivated on a fresh fulfilment — this path only runs after a verified
    // payment (or a free-course enrol), so a customer who was refunded and pays
    // again is not left locked out by the read gates that now deny 'revoked'.
    // The same holds for a pending or unrecognised row (no access): it is updated in place,
    // never duplicated. An active/completed row is a genuine duplicate and stays 'already_enrolled'.
    if (issues) {
      await db.lmsEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          paymentReference,
          completedAt: null,
          certificateIssuedAt: null,
          prerequisiteGated,
        },
      });
      return { enrollmentId: existing.id, courseId: course.id };
    }
    return 'already_enrolled';
  }

  try {
    const enrollment = await db.lmsEnrollment.create({
      data: {
        id: randomUUID(),
        studentId,
        courseId: course.id,
        status: 'active',
        paymentReference,
        prerequisiteGated,
      },
    });

    return { enrollmentId: enrollment.id, courseId: course.id };
  } catch (error) {
    // Concurrent enrolment (Stripe webhook + success-page confirm racing) hits
    // the @@unique([studentId, courseId]) constraint. Treat as already enrolled
    // instead of surfacing a 500 to a paying customer.
    if (swallowUniqueClash && isUniqueConstraintError(error)) {
      return 'already_enrolled';
    }
    throw error;
  }
}

/**
 * Decides how a NEW enrolment meets the course prerequisite. Returns `false` when the
 * prerequisite is met (or does not apply), `true` when the enrolment must be issued LOCKED
 * (`prerequisiteGated`), and throws `PrerequisiteNotMetError` when it must be refused.
 *
 * Admins and admin-created enrolments (`admin:*`) bypass. A Stripe-paid fulfilment
 * (`cs_*`) is NEVER refused here — the money is already taken — but it is issued locked.
 * An individual checkout refuses a buyer without the prerequisite, so an individual order
 * reaching this point is a gap to investigate (logged); a team buyer's own seat is the
 * expected case (founder decision 02/11/2026). Team seat assignment passes `mode: 'lock'`.
 */
async function checkPrerequisitesForNewEnrolment(
  claims: SessionClaims,
  course: { slug: string; meta?: unknown },
  paymentReference: string,
  mode: 'refuse' | 'lock'
): Promise<boolean> {
  if (isAdminOverridePaymentReference(paymentReference)) return false;
  const block = await findCoursePrerequisiteBlock({
    userId: claims.sub,
    isAdmin: () => isLmsClaimsAllowedAdminPanel(claims),
    course: { slug: course.slug, meta: course.meta ?? null },
  });
  if (!block) return false;
  if (mode === 'lock') return true;
  if (isStripeCheckoutPaymentReference(paymentReference)) {
    console.warn(
      '[enrollment] paid fulfilment for a course whose prerequisite is not met; issued locked',
      {
        course: course.slug,
        studentId: claims.sub,
        paymentReference,
      }
    );
    return true;
  }
  throw new PrerequisiteNotMetError(block);
}

/** Marks enrolments created for admin-panel users so analytics can exclude them. */
export const ADMIN_ACCESS_PAYMENT_REFERENCE = 'admin:full-access';

/**
 * Admin-panel users get a self-service enrolment on first access so the whole
 * learner stack (curriculum, lesson view, progress, certificates) works for any
 * course without a purchase.
 *
 * Callers gate this on `shouldStaffAutoEnrol` (the staff helpers below, and the
 * curriculum route). GP-737: staff access follows the role, so a staff member's
 * own row in a no-access status (e.g. `revoked` after an admin removed it) is
 * reactivated as a staff enrolment. Otherwise the empty upsert update left them
 * locked out, while a staff member with no row at all was let in. An active or
 * completed row is never changed.
 */
export async function ensureAdminEnrollmentForCourse(
  claims: SessionClaims,
  courseId: string
): Promise<void> {
  await ensureLmsUserFromClaims(claims);
  let row: { id: string; status: string } | null | undefined = null;
  try {
    row = await prisma.lmsEnrollment.upsert({
      where: { studentId_courseId: { studentId: claims.sub, courseId } },
      create: {
        id: randomUUID(),
        studentId: claims.sub,
        courseId,
        status: 'active',
        paymentReference: ADMIN_ACCESS_PAYMENT_REFERENCE,
      },
      update: {},
      select: { id: true, status: true },
    });
  } catch (error) {
    // A concurrent request created the row (as 'active') between the read and the write.
    if (!isUniqueConstraintError(error)) throw error;
  }
  if (row && !isEnrolmentAccessAllowed(row.status)) {
    await reactivateStaffEnrollment(row.id, row.status);
  }
}

/**
 * GP-737 staff reactivation as one statement guarded on the status it was read in (GP-432): if
 * anything changed the row since that read, the update matches nothing and the row is left alone.
 */
async function reactivateStaffEnrollment(enrollmentId: string, fromStatus: string): Promise<void> {
  await prisma.lmsEnrollment.updateMany({
    where: { id: enrollmentId, status: fromStatus },
    data: {
      status: 'active',
      paymentReference: ADMIN_ACCESS_PAYMENT_REFERENCE,
      completedAt: null,
      certificateIssuedAt: null,
    },
  });
}

export async function getCourseIdForLesson(lessonId: string): Promise<string | null> {
  const lesson = await prisma.lmsLesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });
  return lesson?.module.courseId ?? null;
}

/**
 * Staff access for a lesson: admins (any course) and instructors (allow-listed courses only,
 * see `carsi-workshop-access.ts`) receive a no-purchase enrolment before the normal
 * enrolment check runs. Everyone else is untouched and must hold their own enrolment.
 */
export async function ensureStaffEnrollmentForLesson(
  claims: SessionClaims,
  lessonId: string
): Promise<void> {
  if (!isAdminClaims(claims) && !isInstructorClaims(claims)) return;
  const lesson = await prisma.lmsLesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { course: { select: { id: true, slug: true } } } } },
  });
  const course = lesson?.module.course;
  if (!course || !shouldStaffAutoEnrol(claims, course.slug)) return;
  await ensureAdminEnrollmentForCourse(claims, course.id);
}

/**
 * GP-737: the same staff access for a quiz, so an allow-listed instructor who opens a
 * knowledge check or quiz before any lesson is not refused. Everyone else is untouched.
 */
export async function ensureStaffEnrollmentForQuiz(
  claims: SessionClaims,
  quizId: string
): Promise<void> {
  if (!isAdminClaims(claims) && !isInstructorClaims(claims)) return;
  const quiz = await prisma.lmsQuiz.findUnique({
    where: { id: quizId },
    select: { course: { select: { id: true, slug: true } } },
  });
  const course = quiz?.course;
  if (!course || !shouldStaffAutoEnrol(claims, course.slug)) return;
  await ensureAdminEnrollmentForCourse(claims, course.id);
}

async function lessonTotalsForCourse(
  courseId: string
): Promise<{ ids: string[]; total: number; slug: string | null }> {
  const course = await prisma.lmsCourse.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: { lessons: { select: { id: true } } },
      },
    },
  });
  const ids = course?.modules.flatMap((m) => m.lessons.map((l) => l.id)) ?? [];
  return { ids, total: ids.length, slug: course?.slug ?? null };
}

/** Longest reason an admin may record on a learner-record action (DB CHECK matches). */
export const ADMIN_AUDIT_REASON_MAX = 1000;

/**
 * Admin/support: mark every lesson in an enrollment complete, then sync enrollment status.
 *
 * GP-432: this no longer bypasses assessments (no founder ruling allows an admin to skip
 * them). The enrolment completes only when requiredAssessmentsPassed holds, exactly as for
 * the learner. The admin must give a reason; the current admin (re-checked against the
 * database inside the transaction) and the reason are written to the append-only
 * lms_learner_admin_audit_events in the same transaction as the lesson writes.
 */
export async function forceCompleteEnrollment(
  enrollmentId: string,
  studentId: string,
  options: { session: AdminSessionProvenance | null; reason: string }
): Promise<{ lessonsMarked: number; completed: boolean }> {
  const reason = options.reason.trim();
  if (!reason || reason.length > ADMIN_AUDIT_REASON_MAX) throw new Error('INVALID_REASON');

  const en = await prisma.lmsEnrollment.findFirst({
    where: { id: enrollmentId, studentId },
    select: { id: true, studentId: true, courseId: true, status: true },
  });
  if (!en) throw new Error('ENROLLMENT_NOT_FOUND');
  // A revoked or refunded enrolment is left exactly as it is: no lesson writes, no audit row.
  if (isRevokedStatus(en.status)) throw new Error('ENROLLMENT_REVOKED');

  const { ids, total } = await lessonTotalsForCourse(en.courseId);
  const now = new Date();

  const admin = await prisma.$transaction(async (tx) => {
    const current = await requireCurrentAdmin(tx, options.session);
    // Lock the row and re-check it (one owner: enrollment-row-lock.ts): a revocation either
    // committed before this (refused, ENROLLMENT_REVOKED) or waits until this commits.
    return withLockedEnrollment(
      tx,
      { enrollmentId: en.id, studentId: en.studentId, require: 'admin-change' },
      async () => {
        for (const lessonId of ids) {
          await tx.lmsLessonProgress.upsert({
            where: { studentId_lessonId: { studentId: en.studentId, lessonId } },
            create: {
              studentId: en.studentId,
              lessonId,
              completed: true,
              completedAt: now,
              lastAccessedAt: now,
            },
            update: {
              completed: true,
              completedAt: now,
              lastAccessedAt: now,
            },
          });
        }
        if (total > 0) {
          await tx.lmsEnrollment.update({
            where: { id: en.id },
            data: { lastAccessedLessonId: ids[ids.length - 1]! },
          });
        }
        await tx.lmsLearnerAdminAuditEvent.create({
          data: {
            action: 'force_complete',
            reason,
            actorKind: current.kind,
            actorRef: current.ref,
            actorEmail: current.email,
            studentRef: en.studentId,
            enrollmentRef: en.id,
            courseRef: en.courseId,
            details: { lessonsMarked: total },
          },
        });
        return current;
      }
    );
  });

  await syncEnrollmentCompletion(en.id, en.studentId, en.courseId, {
    initiatedByAdminEmail: admin.email,
  });
  const after = await prisma.lmsEnrollment.findUnique({
    where: { id: en.id },
    select: { status: true },
  });
  return { lessonsMarked: total, completed: after?.status === 'completed' };
}

/**
 * Records the learner's first completion of the course, once. Never overwritten or cleared, so a
 * revocation, re-purchase or curriculum edit cannot move old learning into a later IICRC renewal
 * period (GP-659). Every writer that marks an enrolment completed calls this inside the same
 * transaction as the completion, so a failed history write rolls the completion back too.
 */
export async function recordFirstCompletion(
  enrollmentId: string,
  at: Date,
  db: Prisma.TransactionClient = prisma
): Promise<void> {
  await db.lmsEnrollment.updateMany({
    where: { id: enrollmentId, firstCompletedAt: null },
    data: { firstCompletedAt: at },
  });
}

/**
 * GP-432: passing an assessment can be the last thing an enrolment needs (lessons already
 * done, possibly by an admin). Every writer of a passed quiz attempt or a passed practical
 * calls this after its transaction commits, so completion and the IICRC auto-submit follow
 * the pass without waiting for an unrelated lesson write. It runs the same gated
 * syncEnrollmentCompletion. It never throws: the pass is already recorded, and any later
 * sync (lesson write, certificate request) reaches the same result.
 */
export async function syncCompletionAfterAssessmentPassed(
  studentId: string,
  courseId: string
): Promise<void> {
  try {
    const row = await prisma.lmsEnrollment.findFirst({
      where: { studentId, courseId, status: 'active' },
      select: { id: true },
    });
    if (!row) return;
    await syncEnrollmentCompletion(row.id, studentId, courseId);
  } catch (e) {
    console.error('[enrollment] completion sync after an assessment pass', studentId, courseId, e);
  }
}

export async function syncEnrollmentCompletion(
  enrollmentId: string,
  studentId: string,
  courseId: string,
  options?: {
    initiatedByAdminEmail?: string | null;
    skipIicrcAutoSubmit?: boolean;
  }
): Promise<void> {
  const { ids, total, slug } = await lessonTotalsForCourse(courseId);
  // Cohort-only course: completion (and its certificate of attendance) is written only by
  // the two-day attendance finalisation (ccw-attendance/provision.ts). Lessons and quizzes
  // never complete it, and this sync never downgrades the attendance completion (GP-736).
  if (isCohortOnlyCourse(slug)) return;

  // GP-432: completion is decided ONLY from evidence read under the enrolment row lock (one
  // owner: enrollment-row-lock.ts). The lock is taken FIRST; the prior state, the learner's
  // lesson progress and the assessment results are all read after it, in this transaction,
  // and the decision is written before it commits.
  //  - A revocation (Stripe or admin) either committed before the lock, and is seen here, or
  //    waits until this commits; it cannot land between the read and the write.
  //  - Every writer that can REMOVE completion evidence (a learner un-marking a lesson in
  //    patchLessonProgress, admin revoke) takes the same lock first, so its change is either
  //    seen here or waits until this decision is committed. A decision made on evidence that
  //    was already gone can no longer be written (found by the 69b54a55 review).
  //  - Writers that only ADD evidence (a quiz attempt, a practical submission or review)
  //    re-run this sync after they commit (syncCompletionAfterAssessmentPassed), so a read
  //    that missed them can only leave the enrolment active until that re-run.
  // One transaction also keeps the first-completion record with the completion, so a failed
  // write rolls both back and a retry is still a new completion.
  const newlyGatedCompletion = await prisma.$transaction(async (tx): Promise<boolean> => {
    try {
      return await withLockedEnrollment(
        tx,
        // A revoked/refunded row (or one that is not this learner's) is refused before any read.
        { enrollmentId, studentId, require: 'admin-change' },
        async () => {
          const prior = await tx.lmsEnrollment.findUnique({
            where: { id: enrollmentId },
            select: { completedAt: true, status: true },
          });

          // STICKY REVOCATION (WS3 / P0-C): a revoked/refunded/disputed enrolment is a
          // terminal state. NEVER resurrect it to active/completed on a later sync —
          // otherwise a refunded learner un-revokes themselves simply by marking a lesson
          // or opening their certificate (completedAt survives revocation, so the
          // wasAlreadyCompleted branch below would flip it straight back). This guard
          // covers BOTH the zero-lesson branch and the main completion write.
          if (!prior || isRevokedStatus(prior.status)) return false;

          if (total === 0) {
            await tx.lmsEnrollment.update({
              where: { id: enrollmentId },
              data: { status: 'active', completedAt: null },
            });
            return false;
          }

          // Evidence, read under the lock (see above).
          const completed = await tx.lmsLessonProgress.count({
            where: { studentId, lessonId: { in: ids }, completed: true },
          });
          const allLessonsDone = completed >= total;
          const quizGateSatisfied = await requiredAssessmentsPassed(tx, courseId, slug, studentId);

          const wasAlreadyCompleted = prior.status === 'completed' || prior.completedAt != null;

          // Certificate/CEC integrity: completion needs lessons AND every required assessment
          // passed, but an already-completed enrollment is never downgraded (GP-439 item 3:
          // issued certificates are always retained).
          const isCompleted = decideEnrollmentCompleted({
            allLessonsDone,
            quizGateSatisfied,
            wasAlreadyCompleted,
          });

          const completedAt = isCompleted ? (prior.completedAt ?? new Date()) : null;
          await tx.lmsEnrollment.update({
            where: { id: enrollmentId },
            data: {
              status: isCompleted ? 'completed' : 'active',
              completedAt,
            },
          });
          if (completedAt) await recordFirstCompletion(enrollmentId, completedAt, tx);

          // Only a genuinely new, fully-gated completion written by THIS transaction may fire the
          // (irreversible) IICRC CEC auto-submit; it runs below, after the commit.
          return allLessonsDone && quizGateSatisfied && !wasAlreadyCompleted;
        }
      );
    } catch (e) {
      if (e instanceof EnrollmentLockRefusal) return false;
      throw e;
    }
  });

  if (newlyGatedCompletion && !options?.skipIicrcAutoSubmit) {
    const { processIicrcCecSubmissionForEnrollment } =
      await import('@/lib/server/iicrc-cec-submission');
    void processIicrcCecSubmissionForEnrollment(enrollmentId, {
      initiatedByAdminEmail: options?.initiatedByAdminEmail ?? null,
    }).catch((e) => console.error('[enrollment] IICRC CEC auto-submit', enrollmentId, e));
  }
}

export async function touchLessonProgress(params: {
  studentId: string;
  lessonId: string;
  enrollmentId: string;
}): Promise<void> {
  const { studentId, lessonId, enrollmentId } = params;
  const now = new Date();

  // GP-432: a learner-record write, so it runs under the enrolment lock with the access rule
  // (one owner: enrollment-row-lock.ts). Recording a visit is best effort: an enrolment revoked
  // after the caller's access check records nothing, and the caller's read is unaffected.
  try {
    await prisma.$transaction((tx) =>
      withLockedEnrollment(tx, { enrollmentId, studentId, require: 'access' }, async () => {
        await tx.lmsLessonProgress.upsert({
          where: {
            studentId_lessonId: { studentId, lessonId },
          },
          create: {
            studentId,
            lessonId,
            lastAccessedAt: now,
          },
          update: {
            lastAccessedAt: now,
          },
        });

        await tx.lmsEnrollment.update({
          where: { id: enrollmentId },
          data: { lastAccessedLessonId: lessonId },
        });
      })
    );
  } catch (e) {
    if (!(e instanceof EnrollmentLockRefusal)) throw e;
  }
}

export async function patchLessonProgress(params: {
  studentId: string;
  lessonId: string;
  enrollmentId: string;
  courseId: string;
  completed: boolean;
}): Promise<void> {
  const { studentId, lessonId, enrollmentId, courseId, completed } = params;
  const now = new Date();

  // GP-432: a lesson mark or un-mark changes completion evidence. It runs under the enrolment
  // row lock with the access rule (one owner: enrollment-row-lock.ts): the enrolment must be
  // this learner's and grant access AT THE LOCK, so a revocation that committed after the
  // route's access check is refused here (EnrollmentLockRefusal) and nothing is written. The
  // completion sync decides under the same lock, so it either sees this change or this waits.
  // The evidence for a mark (a passed quiz attempt) is also read under the lock.
  // Lock order everywhere: enrolment row first, then lesson progress.
  await prisma.$transaction((tx) =>
    withLockedEnrollment(tx, { enrollmentId, studentId, require: 'access' }, async () => {
      // The server decides: a learner may mark a lesson complete only on evidence the server
      // holds for that lesson type; un-marking needs none.
      if (completed) await assertLessonCompletionEvidence(tx, studentId, lessonId);
      await tx.lmsLessonProgress.upsert({
        where: {
          studentId_lessonId: { studentId, lessonId },
        },
        create: {
          studentId,
          lessonId,
          completed,
          completedAt: completed ? now : null,
          lastAccessedAt: now,
        },
        update: {
          completed,
          completedAt: completed ? now : null,
          lastAccessedAt: now,
        },
      });

      await tx.lmsEnrollment.update({
        where: { id: enrollmentId },
        data: { lastAccessedLessonId: lessonId },
      });
    })
  );

  await syncEnrollmentCompletion(enrollmentId, studentId, courseId);
}

export async function getEnrollmentForCertificate(
  studentSub: string,
  enrollmentId: string
): Promise<{
  id: string;
  student: { email: string; fullName: string | null };
  course: {
    title: string;
    slug: string;
    iicrcDiscipline: string | null;
    durationHours: unknown;
    level: string | null;
  };
  completedAt: Date;
  certificateIssuedAt: Date | null;
} | null> {
  const row = await prisma.lmsEnrollment.findFirst({
    where: { id: enrollmentId, studentId: studentSub },
    include: {
      student: { select: { email: true, fullName: true } },
      course: {
        select: {
          title: true,
          slug: true,
          id: true,
          iicrcDiscipline: true,
          shortDescription: true,
          description: true,
          meta: true,
          durationHours: true,
          level: true,
        },
      },
    },
  });
  if (!row) return null;

  // No certificate for a revoked/refunded enrolment (WS3 / P0-C). Short-circuit
  // BEFORE syncEnrollmentCompletion — otherwise the sync (were the sticky guard
  // ever bypassed) plus the completed-check below would hand a refunded learner a
  // fresh certificate.
  if (isRevokedStatus(row.status)) return null;

  await syncEnrollmentCompletion(row.id, row.studentId, row.courseId);

  const refreshed = await prisma.lmsEnrollment.findFirst({
    where: { id: enrollmentId, studentId: studentSub },
    include: {
      student: { select: { email: true, fullName: true } },
      course: {
        select: {
          title: true,
          slug: true,
          iicrcDiscipline: true,
          shortDescription: true,
          description: true,
          meta: true,
          durationHours: true,
          level: true,
        },
      },
    },
  });
  if (!refreshed || refreshed.status !== 'completed' || !refreshed.completedAt) {
    return null;
  }

  return {
    id: refreshed.id,
    student: refreshed.student,
    course: refreshed.course,
    completedAt: refreshed.completedAt,
    certificateIssuedAt: refreshed.certificateIssuedAt,
  };
}

export async function markCertificateIssued(enrollmentId: string): Promise<void> {
  // Re-assert completion at MINT time (WS3 / P0-C): if a revocation webhook lands
  // between getEnrollmentForCertificate and here, the guarded updateMany is a no-op
  // so a refunded enrolment can never have its certificateIssuedAt (re)stamped.
  await prisma.lmsEnrollment.updateMany({
    where: { id: enrollmentId, status: 'completed' },
    data: { certificateIssuedAt: new Date() },
  });
}

export async function findEnrollmentForCourse(
  studentId: string,
  courseId: string
): Promise<{ id: string } | null> {
  return prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { id: true },
  });
}

export async function getLessonContextForStudent(
  lessonId: string,
  studentId: string
): Promise<{
  lesson: {
    id: string;
    title: string;
    contentType: string;
    contentBody: string | null;
    orderIndex: number;
    isPreview: boolean;
    resources: unknown;
    module: { courseId: string; course: { id: string; slug: string; title: string } };
  };
  enrollmentId: string;
} | null> {
  const lesson = await prisma.lmsLesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  });
  if (!lesson) return null;

  const enr = await prisma.lmsEnrollment.findUnique({
    where: {
      studentId_courseId: { studentId, courseId: lesson.module.courseId },
    },
    select: { id: true, status: true },
  });
  // Deny paid lesson content to a revoked/refunded/cancelled enrolment (WS3 / P0-C).
  // Existence alone is not entitlement.
  if (!enr || !isEnrolmentAccessAllowed(enr.status)) return null;

  return {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      contentType: lesson.contentType,
      contentBody: lesson.contentBody,
      orderIndex: lesson.orderIndex,
      isPreview: lesson.isPreview,
      resources: lesson.resources,
      module: {
        courseId: lesson.module.courseId,
        course: lesson.module.course,
      },
    },
    enrollmentId: enr.id,
  };
}
