'use client';

import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LogOut,
  Mail,
  Percent,
  Send,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth/auth-provider';
import { ViewModeToggle } from '@/components/layout/ViewModeToggle';

function NavButton({
  href,
  label,
  icon: Icon,
  active,
  newTab = false,
}: {
  href: string;
  label: string;
  icon: typeof Users;
  active: boolean;
  /**
   * Open in a new tab. Used for links that leave the admin shell (e.g. the
   * public /ccw-training page), so the admin session/context is preserved.
   */
  newTab?: boolean;
}) {
  return (
    <Link
      href={href}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200"
      style={
        active
          ? {
              background: 'rgba(36, 144, 237, 0.15)',
              color: '#2490ed',
              border: '1px solid rgba(36, 144, 237, 0.28)',
              boxShadow: '0 0 14px rgba(36, 144, 237, 0.12)',
            }
          : {
              color: 'rgba(255, 255, 255, 0.55)',
              border: '1px solid transparent',
            }
      }
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      {label}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const usersActive = pathname === '/admin' || pathname.startsWith('/admin/users');
  // The Facility course has its own quick-access tab below; don't light the
  // generic Courses tab as well when we're on it.
  const facilityCourseId = '6011d465-1981-487b-84e3-a53b10a2bd07';
  const coursesActive =
    pathname.startsWith('/admin/courses') && !pathname.startsWith(`/admin/courses/${facilityCourseId}`);
  const facilityCourseActive = pathname.startsWith(`/admin/courses/${facilityCourseId}`);
  const discountsActive = pathname.startsWith('/admin/discounts');
  const contactsActive = pathname.startsWith('/admin/contacts');
  const analyticsActive = pathname.startsWith('/admin/analytics');
  const yearlyMembershipActive = pathname.startsWith('/admin/yearly-membership');
  const iicrcCecActive = pathname.startsWith('/admin/iicrc-cec');
  const assessmentsActive = pathname.startsWith('/admin/practical-assessments');
  const ccwRoadshowActive = pathname.startsWith('/admin/ccw-roadshow');

  async function handleSignOut() {
    await signOut();
    router.push(`/login?next=${encodeURIComponent('/admin')}`);
  }

  return (
    <div className="relative z-10 flex h-dvh min-h-0 w-full max-w-full overflow-hidden">
      <aside
        className="scrollbar-glass flex h-full w-[240px] shrink-0 flex-col overflow-hidden"
        style={{
          background: 'rgba(8, 12, 24, 0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <p
            className="text-[10px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'rgba(255, 255, 255, 0.35)' }}
          >
            CARSI
          </p>
          <p className="mt-1 text-lg font-bold tracking-tight text-white/95">Admin</p>
          <div className="mt-3">
            <ViewModeToggle tone="dark" />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-4">
          <NavButton href="/admin" label="Users" icon={Users} active={usersActive} />
          <NavButton href="/admin/courses" label="Courses" icon={BookOpen} active={coursesActive} />
          <NavButton
            href={`/admin/courses/${facilityCourseId}`}
            label="Facility"
            icon={Building2}
            active={facilityCourseActive}
          />
          <NavButton
            href="/ccw-training"
            label="CCW Training"
            icon={GraduationCap}
            // The Carpet Cleaning Workshop is a public page, not an /admin route,
            // so it never lights an active state and opens in a new tab.
            active={false}
            newTab
          />
          <NavButton
            href="/admin/discounts"
            label="Discounts"
            icon={Percent}
            active={discountsActive}
          />
          <NavButton
            href="/admin/yearly-membership"
            label="Yearly Membership"
            icon={BadgeCheck}
            active={yearlyMembershipActive}
          />
          <NavButton
            href="/admin/iicrc-cec"
            label="IICRC CEC"
            icon={Send}
            active={iicrcCecActive}
          />
          <NavButton
            href="/admin/practical-assessments"
            label="Assessments"
            icon={ClipboardCheck}
            active={assessmentsActive}
          />
          <NavButton href="/admin/contacts" label="Contacts" icon={Mail} active={contactsActive} />
          <NavButton
            href="/admin/ccw-roadshow"
            label="CCW Roadshow"
            icon={CalendarDays}
            active={ccwRoadshowActive}
          />
          <NavButton
            href="/admin/analytics"
            label="Analytics"
            icon={BarChart3}
            active={analyticsActive}
          />
        </nav>

        <div className="mt-auto border-t border-white/6 px-2 py-3 pb-6">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/6 hover:text-white"
            title={user?.email ? `Sign out (${user.email})` : 'Sign out'}
          >
            <LogOut className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="min-w-0 truncate">Sign out</span>
          </button>
        </div>
      </aside>

      <main
        id="main-content"
        className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        {children}
      </main>
    </div>
  );
}
