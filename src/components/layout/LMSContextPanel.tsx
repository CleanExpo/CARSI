'use client';

import { Building2, LogOut, Route, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ViewModeToggle } from '@/components/layout/ViewModeToggle';
import { apiClient } from '@/lib/api/client';
import { getDashboardSectionLabel, isDashboardNavActive } from '@/lib/dashboard-nav-active';
import {
  LEARNER_NAV_ACCOUNT,
  LEARNER_NAV_PRIMARY,
  LEARNER_NAV_RECORDS,
  type LearnerNavItem,
} from '@/lib/learner-nav';

function NavLink({ item, pathname }: { item: LearnerNavItem; pathname: string }) {
  const active = isDashboardNavActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
      style={
        active
          ? { background: '#eef7ff', color: '#146fc2', border: '1px solid #b8dbfb' }
          : { color: '#475569', border: '1px solid transparent' }
      }
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {active ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2490ed]" aria-hidden />
      ) : null}
    </Link>
  );
}

export function LMSContextPanel() {
  const pathname = usePathname();
  const { user } = useAuth();
  const section = getDashboardSectionLabel(pathname);
  const [showTeam, setShowTeam] = useState(pathname.startsWith('/dashboard/team'));
  const [showPathways, setShowPathways] = useState(pathname.startsWith('/dashboard/pathways'));
  const showOnboarding = pathname.startsWith('/dashboard/onboarding');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const onTeamRoute = pathname.startsWith('/dashboard/team');
      const onPathwayRoute = pathname.startsWith('/dashboard/pathways');
      try {
        const [teamRes, pathwayRes] = await Promise.all([
          apiClient.get<{ team: unknown | null }>('/api/lms/teams/me'),
          apiClient.get<{
            pathways?: Array<{ courses?: Array<{ enrolled?: boolean }> }>;
          }>('/api/lms/pathways/me/progress'),
        ]);
        if (cancelled) return;
        setShowTeam(Boolean(teamRes?.team) || onTeamRoute);
        const belongs = (pathwayRes.pathways ?? []).some((p) =>
          (p.courses ?? []).some((c) => c.enrolled === true)
        );
        setShowPathways(belongs || onPathwayRoute);
      } catch {
        if (!cancelled) {
          setShowTeam(onTeamRoute);
          setShowPathways(onPathwayRoute);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <aside
      className="z-10 hidden h-screen max-h-screen w-[min(100%,260px)] shrink-0 flex-col overflow-hidden overscroll-none border-r border-slate-200 bg-white md:flex md:flex-col"
      style={{ boxShadow: '1px 0 0 rgba(15,23,42,0.04)' }}
    >
      <div className="shrink-0 border-b border-slate-200 px-4 py-5">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#146fc2] uppercase">CARSI</p>
        <p className="mt-1.5 text-[15px] font-semibold tracking-tight text-slate-950">{section}</p>
        <p className="mt-1 text-xs leading-snug text-slate-500">Your learning</p>
        <div className="mt-3">
          <ViewModeToggle tone="light" />
        </div>
      </div>

      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-4">
        <nav className="flex flex-col gap-0.5" aria-label="Learner navigation">
          {LEARNER_NAV_PRIMARY.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}

          <div className="my-3 border-t border-slate-200" />

          {LEARNER_NAV_RECORDS.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}

          {showPathways || showOnboarding || showTeam ? (
            <>
              <div className="my-3 border-t border-slate-200" />
              {showPathways ? (
                <NavLink
                  item={{ href: '/dashboard/pathways', label: 'Learning path', icon: Route }}
                  pathname={pathname}
                />
              ) : null}
              {showOnboarding ? (
                <NavLink
                  item={{
                    href: '/dashboard/onboarding',
                    label: 'Organisation onboarding',
                    icon: Building2,
                  }}
                  pathname={pathname}
                />
              ) : null}
              {showTeam ? (
                <NavLink
                  item={{ href: '/dashboard/team', label: 'Team', icon: Users }}
                  pathname={pathname}
                />
              ) : null}
            </>
          ) : null}
        </nav>
      </div>

      <div className="shrink-0 border-t border-slate-200 px-2 py-3">
        <nav className="flex flex-col gap-0.5" aria-label="Account">
          {LEARNER_NAV_ACCOUNT.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <a
          href="/api/auth/logout"
          data-testid="dashboard-sign-out"
          className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          title={user?.email ? `Sign out (${user.email})` : 'Sign out'}
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span className="min-w-0 truncate">Sign out</span>
        </a>
      </div>
    </aside>
  );
}
