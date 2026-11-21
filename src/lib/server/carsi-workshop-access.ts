/**
 * Access rules for the CARSI 2-day carpet cleaning workshop course (roadshow cohort course).
 *
 * The course is unlisted and free. Only two groups may open it:
 *   1. Learners with an access-granting enrolment (roadshow attendees are enrolled at Day-1
 *      check-in by `ccw-attendance/provision.ts`).
 *   2. Authorised CARSI staff: admins (every course, existing behaviour) and instructors
 *      (only the courses listed in `INSTRUCTOR_STAFF_ACCESS_COURSE_SLUGS`).
 *
 * The instructor manual is staff-only. These are pure predicates so every route asks the
 * same question; the routes do the database reads.
 */
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { isEnrolmentAccessAllowed, isRevokedStatus } from '@/lib/server/enrollment-access';

/** The workshop's LMS slug. Re-exported from the attendance foundation's single source. */
export { CCW_2DAY_COURSE_SLUG as CARSI_WORKSHOP_COURSE_SLUG } from '@/lib/server/ccw-attendance/eligibility';

/** Permanent public CARSI URL path for the workshop programme page. */
export const CARSI_WORKSHOP_PATH = '/workshops/carpet-cleaning';

/**
 * Courses an `instructor` session may open without a purchase (staff auto-enrolment).
 * Kept to an explicit allow-list: instructors do not get blanket access to paid courses.
 */
export const INSTRUCTOR_STAFF_ACCESS_COURSE_SLUGS: ReadonlySet<string> = new Set([
  'ccw-2-day-workshop',
]);

function roleOf(claims: SessionClaims | null | undefined): string {
  return (claims?.role ?? '').trim().toLowerCase();
}

export function isAdminClaims(claims: SessionClaims | null | undefined): boolean {
  return roleOf(claims) === 'admin';
}

export function isInstructorClaims(claims: SessionClaims | null | undefined): boolean {
  return roleOf(claims) === 'instructor';
}

/**
 * True when this session should receive a staff (no-purchase) enrolment for the course.
 * Admins: any course (unchanged). Instructors: allow-listed course slugs only.
 */
export function shouldStaffAutoEnrol(
  claims: SessionClaims | null | undefined,
  courseSlug: string | null | undefined
): boolean {
  if (!claims) return false;
  if (isAdminClaims(claims)) return true;
  if (!courseSlug) return false;
  return isInstructorClaims(claims) && INSTRUCTOR_STAFF_ACCESS_COURSE_SLUGS.has(courseSlug);
}

/** Instructor manual: authorised CARSI instructors and admins only. Never participants. */
export function canViewInstructorManual(claims: SessionClaims | null | undefined): boolean {
  return isAdminClaims(claims) || isInstructorClaims(claims);
}

export type WorkshopAccessState = 'signed-out' | 'not-enrolled' | 'enrolled' | 'staff';

/**
 * What the workshop page and the manual downloads may show this visitor.
 * `enrollmentStatus` is the visitor's enrolment status on the workshop course, or null.
 *
 * A revoked (refund/chargeback family) workshop enrolment outranks the staff role: it is a
 * deliberate lock-out, and the lesson, curriculum, checkpoint and quiz routes already deny it,
 * so the manuals and the page must too (GP-737). Staff with no row at all keep access.
 */
export function workshopAccessState(
  claims: SessionClaims | null | undefined,
  enrollmentStatus: string | null | undefined
): WorkshopAccessState {
  if (!claims) return 'signed-out';
  if (isRevokedStatus(enrollmentStatus)) return 'not-enrolled';
  if (canViewInstructorManual(claims)) return 'staff';
  if (isEnrolmentAccessAllowed(enrollmentStatus)) return 'enrolled';
  return 'not-enrolled';
}

/** Participant manual: an access-granting enrolment, or staff. */
export function canDownloadParticipantManual(state: WorkshopAccessState): boolean {
  return state === 'enrolled' || state === 'staff';
}

/**
 * Cohort-only courses: a learner gets in only through the Day-1 attendance check-in (or an
 * admin), and completion is written only by the two-day attendance finalisation. This set is
 * the one owner of that rule; the enrolment writer, the completion writer and the
 * certificate wording all ask it.
 */
const COHORT_ONLY_COURSE_SLUGS: ReadonlySet<string> = new Set(['ccw-2-day-workshop']);

/**
 * Payment reference the attendance provisioner writes on a cohort enrolment. Must equal
 * `CCW_ATTENDANCE_PAYMENT_REFERENCE` in `ccw-attendance/provision.ts` (asserted by test);
 * kept here to avoid an import cycle with the enrolment writer.
 */
export const COHORT_ENROLMENT_PAYMENT_REFERENCE = 'ccw:attendance';

export function isCohortOnlyCourse(slug: string | null | undefined): boolean {
  return typeof slug === 'string' && COHORT_ONLY_COURSE_SLUGS.has(slug.trim().toLowerCase());
}

/**
 * May this payment reference issue an enrolment on the course? Every course except a
 * cohort-only course: yes. A cohort-only course: only the attendance check-in or an admin
 * (`admin:*`). Free confirm, membership, team, org and Stripe paths are refused.
 */
export function mayIssueEnrolment(
  courseSlug: string | null | undefined,
  paymentReference: string | null | undefined
): boolean {
  if (!isCohortOnlyCourse(courseSlug)) return true;
  const ref = (paymentReference ?? '').trim().toLowerCase();
  return ref === COHORT_ENROLMENT_PAYMENT_REFERENCE || ref.startsWith('admin:');
}

/** Cohort workshops issue a certificate of attendance (both days checked in), not completion. */
export function certificateKindForCourseSlug(slug: string | null | undefined): 'completion' | 'attendance' {
  return isCohortOnlyCourse(slug) ? 'attendance' : 'completion';
}
