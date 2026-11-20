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
import { isEnrolmentAccessAllowed } from '@/lib/server/enrollment-access';

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
 * What the workshop page and the participant-manual download may show this visitor.
 * `enrollmentStatus` is the visitor's enrolment status on the workshop course, or null.
 */
export function workshopAccessState(
  claims: SessionClaims | null | undefined,
  enrollmentStatus: string | null | undefined
): WorkshopAccessState {
  if (!claims) return 'signed-out';
  if (canViewInstructorManual(claims)) return 'staff';
  if (isEnrolmentAccessAllowed(enrollmentStatus)) return 'enrolled';
  return 'not-enrolled';
}

/** Participant manual: an access-granting enrolment, or staff. */
export function canDownloadParticipantManual(state: WorkshopAccessState): boolean {
  return state === 'enrolled' || state === 'staff';
}

/** Cohort workshops issue a certificate of attendance (both days checked in), not completion. */
export function certificateKindForCourseSlug(slug: string | null | undefined): 'completion' | 'attendance' {
  return slug === 'ccw-2-day-workshop' ? 'attendance' : 'completion';
}
