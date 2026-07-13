/**
 * CCW/CARSI attendance foundation (unit A) — Stage 3 BOTH-DAYS → completion → CEC.
 *
 * When a sign-in is checked in on BOTH days and has been provisioned an
 * enrolment, this finalises the workshop for that person:
 *   - Enrolment is marked `completed` (grants the certificate of attendance).
 *     This happens for EVERYONE who did both days, IICRC# or not.
 *   - CEC is submitted ONLY when the attendee supplied an IICRC# AND the course
 *     carries founder-set `cecHours > 0`. We FEED the existing pipeline
 *     (`processIicrcCecSubmissionForEnrollment`) — we never write
 *     `lms_iicrc_cec_submissions` directly. That function is idempotent (guards
 *     on `status === 'sent'`) and re-reads completion + `cecHours` + the
 *     student's `iicrcMemberNumber`, so a re-tap can never double-submit and a
 *     `cecHours: 0` course is correctly refused.
 *
 * Trigger point (per spec): this runs from the async admin batch (or an admin
 * "finalise CEC" action) — NEVER synchronously in the door route (that path must
 * stay I/O-free; DO→external egress 504s). The "queue signal" is simply the
 * derived cache: a row with both day columns set + an `enrollmentId` is ready to
 * finalise, and the batch scans for exactly that.
 *
 * Completion is guarded against the sticky-revocation invariant: a revoked /
 * refunded enrolment is never resurrected to `completed`.
 */
import { cecEligible } from '@/lib/server/ccw-attendance/eligibility';
import { processIicrcCecSubmissionForEnrollment } from '@/lib/server/iicrc-cec-submission';
import { prisma } from '@/lib/prisma';

export interface FinalizeCecOptions {
  /** AdminUser email that triggered finalisation (forwarded to the CEC record). */
  initiatedByAdminEmail?: string | null;
}

export type FinalizeCecStatus =
  /** Not both days yet, or no enrolment — nothing to finalise. */
  | 'not_ready'
  /** Enrolment was revoked/refunded — never resurrected. */
  | 'skipped_revoked'
  /** Both days done, completed for cert-of-attendance, but NOT CEC-eligible. */
  | 'completed_no_cec'
  /** Both days done + IICRC# + cecHours>0 — completed and CEC pipeline fed. */
  | 'cec_queued';

export interface FinalizeCecResult {
  signInId: string;
  status: FinalizeCecStatus;
  enrollmentId?: string;
  cecEligible: boolean;
}

/**
 * Finalise one sign-in. NEVER throws — a failure is surfaced as a status, so a
 * batch keeps going. Idempotent: re-running on an already-completed / already-
 * sent enrolment is a no-op (the CEC pipeline's `sent` guard absorbs re-taps).
 */
export async function finalizeCecForSignIn(
  signInId: string,
  options?: FinalizeCecOptions,
): Promise<FinalizeCecResult> {
  const signIn = await prisma.ccwRoadshowSignIn.findUnique({
    where: { id: signInId },
    select: {
      id: true,
      day1CheckedInAt: true,
      day2CheckedInAt: true,
      iicrcRegNumber: true,
      studentId: true,
      enrollmentId: true,
      provisionStatus: true,
    },
  });

  if (
    !signIn ||
    signIn.day1CheckedInAt == null ||
    signIn.day2CheckedInAt == null ||
    signIn.enrollmentId == null
  ) {
    return { signInId, status: 'not_ready', cecEligible: false };
  }

  const enrollmentId = signIn.enrollmentId;
  const enrollment = await prisma.lmsEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, status: true, course: { select: { cecHours: true } } },
  });
  if (!enrollment) {
    return { signInId, status: 'not_ready', enrollmentId, cecEligible: false };
  }

  const isEligible = cecEligible(
    {
      day1CheckedInAt: signIn.day1CheckedInAt,
      day2CheckedInAt: signIn.day2CheckedInAt,
      iicrcRegNumber: signIn.iicrcRegNumber,
      studentId: signIn.studentId,
      enrollmentId,
      provisionStatus: signIn.provisionStatus,
    },
    enrollment.course?.cecHours ?? null,
  );

  // Mark completed for the certificate of attendance — but only from `active`.
  // A guarded updateMany means a revoked/refunded enrolment is never resurrected,
  // and an already-`completed` row is left untouched (idempotent).
  const now = new Date();
  const promoted = await prisma.lmsEnrollment.updateMany({
    where: { id: enrollmentId, status: 'active' },
    data: { status: 'completed', completedAt: now },
  });

  if (promoted.count === 0 && enrollment.status !== 'completed') {
    // Not active and not completed → terminal/revoked; do not touch or submit.
    return { signInId, status: 'skipped_revoked', enrollmentId, cecEligible: isEligible };
  }

  if (!isEligible) {
    // Account + course + certificate-of-attendance stand; no CEC submission.
    return { signInId, status: 'completed_no_cec', enrollmentId, cecEligible: false };
  }

  // Feed the EXISTING CEC pipeline (idempotent on `sent`). Fire-and-forget to
  // match the codebase pattern; a torn-down process just retries next batch.
  void processIicrcCecSubmissionForEnrollment(enrollmentId, {
    initiatedByAdminEmail: options?.initiatedByAdminEmail ?? null,
  }).catch((e) => console.error('[ccw-cec] submit', signInId, enrollmentId, e));

  return { signInId, status: 'cec_queued', enrollmentId, cecEligible: true };
}

export interface FinalizeCecBatchSummary {
  eventSlug: string;
  considered: number;
  completed: number;
  cecQueued: number;
  results: FinalizeCecResult[];
}

/**
 * Finalise CEC for every both-days, enrolled sign-in of an event. Resilient:
 * each row is finalised independently.
 */
export async function finalizeCecForEvent(
  eventSlug: string,
  options?: FinalizeCecOptions,
): Promise<FinalizeCecBatchSummary> {
  const rows = await prisma.ccwRoadshowSignIn.findMany({
    where: {
      eventSlug,
      day1CheckedInAt: { not: null },
      day2CheckedInAt: { not: null },
      enrollmentId: { not: null },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  const results: FinalizeCecResult[] = [];
  for (const row of rows) {
    results.push(await finalizeCecForSignIn(row.id, options));
  }

  return {
    eventSlug,
    considered: rows.length,
    completed: results.filter(
      (r) => r.status === 'completed_no_cec' || r.status === 'cec_queued',
    ).length,
    cecQueued: results.filter((r) => r.status === 'cec_queued').length,
    results,
  };
}
