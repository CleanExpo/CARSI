import type { SessionClaims } from '@/lib/auth/session-jwt';
import type { CourseListItem } from '@/lib/course-list-item';
import {
  canSeeDraftCourses,
  effectiveDashboardCourseStatus,
  getDashboardCourseListItemsFromDatabase,
  type DashboardCourseStatusFilter,
} from '@/lib/server/public-courses-list';
import { getServerSessionClaims } from '@/lib/server/session-server';

/**
 * The dashboard catalogue for the CURRENT session (WS1 fix 3, GP-542).
 *
 * The role comes from the session cookie read here, never from a caller argument, so a page
 * cannot ask for drafts on a learner's behalf by passing the wrong role. The list module's own
 * coercion runs again underneath with the same role (defence in depth). Kept out of
 * public-courses-list.ts because that module also serves the sitemap, the homepage and the
 * public catalogue, which must not touch request-scoped cookies.
 */
export interface DashboardCoursesForSession {
  claims: SessionClaims | null;
  canSeeDrafts: boolean;
  /** The status actually queried: the request for admin and instructor, published for everyone else. */
  status: DashboardCourseStatusFilter;
  courses: CourseListItem[];
}

export async function getDashboardCoursesForSession(
  requested: DashboardCourseStatusFilter,
): Promise<DashboardCoursesForSession> {
  const claims = await getServerSessionClaims();
  const role = claims?.role;
  const canSeeDrafts = canSeeDraftCourses(role);
  const status = effectiveDashboardCourseStatus(requested, role);
  const courses = await getDashboardCourseListItemsFromDatabase({ status, role });
  return { claims, canSeeDrafts, status, courses };
}
