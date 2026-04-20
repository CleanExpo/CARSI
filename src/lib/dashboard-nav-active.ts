/** Normalized path without trailing slash (except root). */
export function normalizeDashboardPath(pathname: string): string {
  if (!pathname) return '/';
  const t = pathname.replace(/\/$/, '');
  return t === '' ? '/' : t;
}

/**
 * Active state for dashboard icon rail + context panel.
 * `/dashboard` matches only the overview, not `/dashboard/courses` etc.
 */
export function isDashboardNavActive(pathname: string, href: string): boolean {
  const p = normalizeDashboardPath(pathname);
  const h = normalizeDashboardPath(href);

  if (h === '/dashboard') return p === '/dashboard';
  if (h === '/dashboard/courses') return p === '/dashboard/courses' || p.startsWith('/dashboard/courses/');
  if (h === '/dashboard/student/profile') {
    return p === '/dashboard/student/profile' || p.startsWith('/dashboard/student/profile/');
  }
  if (h === '/dashboard/student/credentials') {
    return (
      p.startsWith('/dashboard/student/credentials') || /^\/dashboard\/credentials\//.test(p)
    );
  }
  if (h === '/dashboard/student/leaderboard') {
    return p.startsWith('/dashboard/student/leaderboard');
  }
  if (h === '/dashboard/student/notes') {
    return p.startsWith('/dashboard/student/notes');
  }
  if (h === '/dashboard/student') {
    if (p.startsWith('/dashboard/student/profile')) return false;
    if (p.startsWith('/dashboard/student/credentials')) return false;
    if (p.startsWith('/dashboard/student/leaderboard')) return false;
    if (p.startsWith('/dashboard/student/notes')) return false;
    if (/^\/dashboard\/credentials\//.test(p)) return false;
    if (p.startsWith('/dashboard/student')) return true;
    if (p.startsWith('/dashboard/learn')) return true;
    return false;
  }
  if (h === '/dashboard/instructor') return p.startsWith('/dashboard/instructor');
  if (h === '/admin') return p.startsWith('/admin');
  if (h === '/dashboard/settings') return p.startsWith('/dashboard/settings');
  return p === h || p.startsWith(`${h}/`);
}

export function getDashboardSectionLabel(pathname: string): string {
  const p = normalizeDashboardPath(pathname);
  if (p === '/dashboard') return 'Overview';
  if (p.startsWith('/dashboard/courses')) return 'Courses';
  if (p.startsWith('/dashboard/learn')) return 'Learning';
  if (p.startsWith('/dashboard/student/credentials') || p.startsWith('/dashboard/credentials/')) {
    return 'Certificates';
  }
  if (p.startsWith('/dashboard/student/leaderboard')) return 'Recognition';
  if (p.startsWith('/dashboard/student/notes')) return 'Notes';
  if (p.startsWith('/dashboard/student/profile')) return 'Profile';
  if (p.startsWith('/dashboard/student')) return 'My learning';
  if (p.startsWith('/dashboard/pathways')) return 'Pathways';
  if (p.startsWith('/dashboard/instructor')) return 'Instructor';
  if (p.startsWith('/dashboard/settings')) return 'Settings';
  if (p.startsWith('/admin')) return 'Admin';
  return 'Dashboard';
}
