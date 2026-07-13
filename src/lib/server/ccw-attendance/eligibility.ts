/**
 * CCW/CARSI attendance foundation (unit A) — PURE server-side derivation.
 *
 * Every downstream decision (course access and — for a LATER unit — offer
 * eligibility) is derived here from ONE `CcwRoadshowSignIn` row. There is no
 * client-presented attendance flag; these predicates are the only source of
 * truth and run server-side only.
 *
 * This course promotes CCW commercial products, so IICRC will NOT grant CECs:
 * there is no CEC eligibility here. Attending both days yields a plain
 * certificate of attendance (issued in the async batch), not a CEC submission.
 *
 * NOTE: these are pure functions of the row's current state. The day columns are
 * the write-once source of truth for attendance.
 */

/**
 * The canonical slug of the real 2-day CCW/CARSI workshop `LmsCourse`.
 *
 * The course row itself is FOUNDER-GATED — see `scripts/seed-ccw-2day-course.ts`.
 * This constant only names the slug the foundation reconciles against. The course
 * is free + unlisted with NO CEC.
 */
export const CCW_2DAY_COURSE_SLUG = 'ccw-2-day-workshop';

/**
 * Single accessor for the workshop course slug. Kept as a function so later
 * units can resolve it per-event without every call site importing the raw
 * constant. (The slug is intentionally NOT wired into
 * `src/lib/marketing/ccw-roadshow.ts`: that file is client-shared and must not
 * import this server module, and duplicating the literal there would risk
 * drift. This is the single source of truth.)
 */
export function getCcwWorkshopCourseSlug(): string {
  return CCW_2DAY_COURSE_SLUG;
}

/**
 * Minimal structural shape of the fields these predicates read. A real
 * `CcwRoadshowSignIn` (Prisma) satisfies this by structural typing, but keeping
 * a narrow local interface keeps the derivation decoupled and unit-testable
 * without a DB row.
 */
export interface CcwSignInEligibilityInput {
  day1CheckedInAt: Date | null;
  day2CheckedInAt: Date | null;
  studentId: string | null;
  enrollmentId: string | null;
  provisionStatus: string;
}

/** True once the attendee has an enrolment (account + 2-day-course access). */
function isProvisioned(signIn: CcwSignInEligibilityInput): boolean {
  return (
    signIn.enrollmentId != null ||
    signIn.studentId != null ||
    signIn.provisionStatus === 'provisioned'
  );
}

function hasAnyCheckIn(signIn: CcwSignInEligibilityInput): boolean {
  return signIn.day1CheckedInAt != null || signIn.day2CheckedInAt != null;
}

/**
 * Course access is granted at Day-1 once the attendee is provisioned/enrolled —
 * it is NOT gated on both days. (Both-days only matters for the certificate of
 * attendance, issued in the async batch.)
 */
export function courseAccessGranted(signIn: CcwSignInEligibilityInput): boolean {
  return isProvisioned(signIn);
}

/**
 * True once the attendee has completed BOTH days — the trigger for the
 * certificate of attendance. Pure predicate; the actual certificate write
 * (LmsEnrollment.certificateIssuedAt) happens in the async batch.
 */
export function attendanceComplete(signIn: CcwSignInEligibilityInput): boolean {
  return signIn.day1CheckedInAt != null && signIn.day2CheckedInAt != null;
}

/**
 * Base predicate for a LATER offer unit (deferred — no offer UI is wired now).
 * Exposed here so the invariant "offers are computed server-side from stored
 * rows" is stated at the foundation. True when provisioned AND has >= 1
 * check-in.
 */
export function baseOfferEligible(signIn: CcwSignInEligibilityInput): boolean {
  return isProvisioned(signIn) && hasAnyCheckIn(signIn);
}
