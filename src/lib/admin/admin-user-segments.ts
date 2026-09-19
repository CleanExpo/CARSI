import type { AdminDashboardUserEntry } from '@/lib/admin/admin-dashboard-data';

export type AdminUserSegment =
  'all' | 'new' | 'active' | 'never_started' | 'in_progress' | 'completed' | 'paid' | 'inactive';

export const ADMIN_USER_SEGMENTS: { id: AdminUserSegment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New this month' },
  { id: 'active', label: 'Active learners' },
  { id: 'never_started', label: 'Bought, not started' },
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

/** Enrolled and still at 0% overall. */
export function isBoughtNotStarted(
  u: Pick<AdminDashboardUserEntry, 'overallCompletionPct' | 'enrollmentCount'>
): boolean {
  return u.enrollmentCount > 0 && progressPct(u) === 0;
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
  if (segment === 'in_progress' || segment === 'active') return isActiveLearner(u);
  if (segment === 'completed') return u.enrollmentCount > 0 && pct === 100;
  if (segment === 'new') {
    const created = new Date(u.createdAt);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }
  return true;
}

export function parseAdminUserSegment(raw: string | null): AdminUserSegment {
  return ADMIN_USER_SEGMENTS.some((s) => s.id === raw) ? (raw as AdminUserSegment) : 'all';
}
