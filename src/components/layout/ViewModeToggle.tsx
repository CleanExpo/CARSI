'use client';

import { GraduationCap, ShieldCheck } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth/auth-provider';

/**
 * Admin-only switch between the ADMIN surface (`/admin`) and the LEARNER surface
 * (`/dashboard/student`) without signing out. It exists because the admin panel
 * hides the learner-facing course experience — an admin needs to see the courses
 * exactly as a student does. This is a plain navigation control, not impersonation:
 * an admin LMS session already satisfies both route gates, so no session mutation
 * is involved. Active mode is derived from the current URL (single source of truth,
 * no hidden state to drift).
 *
 * Rendered inside three chrome slots (desktop learner sidebar, mobile learner
 * header, admin sidebar), so it takes a `tone` for the dark admin glass vs the
 * white learner chrome.
 */
export function ViewModeToggle({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Show only to accounts that can actually reach /admin. `can_access_admin`
  // covers the email allowlist (support@ / phill.m@); the roles check is a
  // belt-and-braces fallback for a literal JWT role of `admin`.
  const canAdmin = Boolean(user?.can_access_admin) || (user?.roles?.includes('admin') ?? false);
  if (!canAdmin) return null;

  const onAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const dark = tone === 'dark';

  const track = dark
    ? 'border-white/12 bg-white/5'
    : 'border-slate-200 bg-slate-100/80';

  function segClass(active: boolean) {
    if (active) {
      return 'bg-[#146fc2] text-white shadow-sm';
    }
    return dark
      ? 'text-white/55 hover:text-white/85'
      : 'text-slate-500 hover:text-slate-800';
  }

  return (
    <div
      role="group"
      aria-label="View mode"
      className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${track}`}
    >
      <button
        type="button"
        aria-pressed={onAdmin}
        title="Admin dashboard"
        onClick={() => {
          if (!onAdmin) router.push('/admin');
        }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${segClass(onAdmin)}`}
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Admin</span>
      </button>
      <button
        type="button"
        aria-pressed={!onAdmin}
        title="Learner view — see courses as a student does"
        onClick={() => {
          if (onAdmin) router.push('/dashboard/student');
        }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${segClass(!onAdmin)}`}
      >
        <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Learner view</span>
      </button>
    </div>
  );
}
