import type { AdminDashboardUserEntry } from '@/lib/admin/admin-dashboard-data';

export type AdminUserSegment =
  | 'all'
  | 'new'
  | 'active'
  | 'never_started'
  | 'enrolled_not_started'
  | 'in_progress'
  | 'completed'
  | 'paid'
  | 'inactive';

export const ADMIN_USER_SEGMENTS: { id: AdminUserSegment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New this month' },
  { id: 'active', label: 'Active learners' },
  { id: 'never_started', label: 'Bought, not started' },
  { id: 'enrolled_not_started', label: 'Enrolled, not started' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed a course' },
  { id: 'paid', label: 'Has a payment' },
  { id: 'inactive', label: 'Account off' },
];

export const ADMIN_USERS_PAGE_SIZE = 9;

export const ADMIN_USERS_PAGE_SIZE_OPTIONS = [9, 18, 27, 36, 50] as const;

export type AdminUsersPageSize = (typeof ADMIN_USERS_PAGE_SIZE_OPTIONS)[number];

export function parseAdminUsersPageSize(
  raw: string | number | null | undefined
): AdminUsersPageSize {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return (ADMIN_USERS_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? (n as AdminUsersPageSize)
    : ADMIN_USERS_PAGE_SIZE;
}

function progressPct(u: Pick<AdminDashboardUserEntry, 'overallCompletionPct'>): number {
  return u.overallCompletionPct;
}

/** Overall progress 1–99%. */
export function isActiveLearner(
  u: Pick<AdminDashboardUserEntry, 'overallCompletionPct' | 'enrollmentCount'>
): boolean {
  const pct = progressPct(u);
  return u.enrollmentCount > 0 && pct >= 1 && pct <= 99;
}

/**
 * Holds at least one Stripe-bought seat that is active with no lessons done (GP-766).
 * Free, admin, team and membership enrolments never count: see `enrollmentIsStripePaid`.
 */
export function isBoughtNotStarted(
  u: Pick<AdminDashboardUserEntry, 'boughtNotStartedCount'>
): boolean {
  return u.boughtNotStartedCount > 0;
}

/** Enrolled in anything, paid or not, and still at 0% overall. */
export function isEnrolledNotStarted(
  u: Pick<AdminDashboardUserEntry, 'overallCompletionPct' | 'enrollmentCount'>
): boolean {
  return u.enrollmentCount > 0 && progressPct(u) === 0;
}

const sydneyYearMonthFormat = new Intl.DateTimeFormat('en-AU', {
  year: 'numeric',
  month: '2-digit',
  timeZone: 'Australia/Sydney',
});

function sydneyYearMonth(date: Date): string {
  return sydneyYearMonthFormat.format(date);
}

export function matchesAdminUserSegment(
  u: AdminDashboardUserEntry,
  segment: AdminUserSegment,
  now: Date
): boolean {
  const pct = progressPct(u);
  if (segment === 'all') return true;
  if (segment === 'inactive') return !u.isActive;
  if (segment === 'paid') return u.paidEnrollmentCount > 0;
  if (segment === 'never_started') return isBoughtNotStarted(u);
  if (segment === 'enrolled_not_started') return isEnrolledNotStarted(u);
  if (segment === 'in_progress' || segment === 'active') return isActiveLearner(u);
  if (segment === 'completed') return u.enrollmentCount > 0 && pct === 100;
  if (segment === 'new') {
    // Compare calendar months in Sydney, not the runtime's zone: the server (UTC) and the
    // browser must agree, or the filtered row count differs on hydration (GP-768).
    return sydneyYearMonth(new Date(u.createdAt)) === sydneyYearMonth(now);
  }
  return true;
}

export function parseAdminUserSegment(raw: string | null): AdminUserSegment {
  return ADMIN_USER_SEGMENTS.some((s) => s.id === raw) ? (raw as AdminUserSegment) : 'all';
}
