/**
 * CCW/CARSI attendance foundation (unit A) — PURE server-side derivation.
 *
 * Every downstream decision (course access, CEC eligibility, and — for a LATER
 * unit — offer eligibility) is derived here from ONE `CcwRoadshowSignIn` row
 * plus the course's founder-set `cecHours`. There is no client-presented
 * attendance flag; these predicates are the only source of truth and run
 * server-side only.
 *
 * NOTE: these are pure functions of the row's current state. The row's day
 * columns are themselves a derived cache of the append-only
 * `CcwRoadshowCheckInEvent` ledger — callers must recompute that cache from the
 * ledger before trusting these predicates for a regulatory decision.
 */

/**
 * The canonical slug of the real 2-day CCW/CARSI workshop `LmsCourse`.
 *
 * The course row itself (and its `cecHours` / `iicrcDiscipline`) is
 * FOUNDER-GATED — see `scripts/seed-ccw-2day-course.ts`. This constant only
 * names the slug the foundation reconciles against; it never sets a CEC value.
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
  iicrcRegNumber: string | null;
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

function hasIicrcRegNumber(signIn: CcwSignInEligibilityInput): boolean {
  return signIn.iicrcRegNumber != null && signIn.iicrcRegNumber.trim() !== '';
}

/**
 * Course access is granted at Day-1 once the attendee is provisioned/enrolled —
 * it is NOT gated on both days. (Both-days only matters for CEC.)
 */
export function courseAccessGranted(signIn: CcwSignInEligibilityInput): boolean {
  return isProvisioned(signIn);
}

/**
 * CEC-eligible only when the attendee checked in BOTH days, supplied an IICRC
 * registration number, AND the course carries founder-set CEC hours (> 0).
 * A missing/zero `cecHours` (the "not CEC-approved" default) yields false so
 * the attendee still gets account + course + certificate of attendance, but no
 * CEC submission.
 */
export function cecEligible(
  signIn: CcwSignInEligibilityInput,
  courseCecHours: number | null | undefined,
): boolean {
  return (
    signIn.day1CheckedInAt != null &&
    signIn.day2CheckedInAt != null &&
    hasIicrcRegNumber(signIn) &&
    typeof courseCecHours === 'number' &&
    courseCecHours > 0
  );
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
