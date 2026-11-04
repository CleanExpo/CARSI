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
  Menu,
  Route,
  Mail,
  Megaphone,
  Percent,
  Send,
  Users,
  MessageCircleQuestion,
  LineChart,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ViewModeToggle } from '@/components/layout/ViewModeToggle';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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
  const [open, setOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);

  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  const overviewActive = pathname === '/admin';
  const usersActive = pathname.startsWith('/admin/users');
  // The Facility course has its own quick-access tab below; don't light the
  // generic Courses tab as well when we're on it.
  const facilityCourseId = '6011d465-1981-487b-84e3-a53b10a2bd07';
  const coursesActive =
    pathname.startsWith('/admin/courses') &&
    !pathname.startsWith(`/admin/courses/${facilityCourseId}`);
  const facilityCourseActive = pathname.startsWith(`/admin/courses/${facilityCourseId}`);
  const discountsActive = pathname.startsWith('/admin/discounts');
  const contactsActive = pathname.startsWith('/admin/contacts');
  const marketingActive = pathname.startsWith('/admin/marketing');
  const businessCoachingAdminActive = pathname.startsWith('/admin/business-coaching');
  const learningPathsActive = pathname.startsWith('/admin/coaching-learning-paths');
  const coachQuestionsActive = pathname.startsWith('/admin/coaching-questions');
  const accountabilityActive = pathname.startsWith('/admin/coaching-accountability');
  const analyticsActive = pathname.startsWith('/admin/analytics');
  const yearlyMembershipActive = pathname.startsWith('/admin/yearly-membership');
  const iicrcCecActive = pathname.startsWith('/admin/iicrc-cec');
  const assessmentsActive = pathname.startsWith('/admin/practical-assessments');
  const ccwRoadshowActive = pathname.startsWith('/admin/ccw-roadshow');

  async function handleSignOut() {
    await signOut();
    router.push(`/login?next=${encodeURIComponent('/admin')}`);
  }

  const sidebar = (
    <>
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

      <nav
        aria-label="Admin navigation"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-4 whitespace-nowrap md:min-h-auto md:overflow-visible [&>*]:shrink-0"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) setOpen(false);
        }}
      >
        <NavButton href="/admin" label="Overview" icon={BarChart3} active={overviewActive} />
        <NavButton href="/admin/users" label="Users" icon={Users} active={usersActive} />
        <NavButton href="/admin/courses" label="Courses" icon={BookOpen} active={coursesActive} />
        <NavButton
          href={`/admin/courses/${facilityCourseId}`}
          label="Facility"
          icon={Building2}
          active={facilityCourseActive}
        />
        <NavButton
          href="/ccw-training"
          label="Business Coaching"
          icon={GraduationCap}
          // Public marketing page, not an /admin route,
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
        <NavButton href="/admin/iicrc-cec" label="IICRC CEC" icon={Send} active={iicrcCecActive} />
        <NavButton
          href="/admin/practical-assessments"
          label="Assessments"
          icon={ClipboardCheck}
          active={assessmentsActive}
        />
        <NavButton href="/admin/contacts" label="Contacts" icon={Mail} active={contactsActive} />
        <NavButton
          href="/admin/marketing"
          label="Marketing"
          icon={Megaphone}
          active={marketingActive}
        />
        <NavButton
          href="/admin/business-coaching"
          label="Owner Circle"
          icon={Users}
          active={businessCoachingAdminActive}
        />
        <NavButton
          href="/admin/coaching-learning-paths"
          label="Learning paths"
          icon={Route}
          active={learningPathsActive}
        />
        <NavButton
          href="/admin/coaching-questions"
          label="Coach questions"
          icon={MessageCircleQuestion}
          active={coachQuestionsActive}
        />
        <NavButton
          href="/admin/coaching-accountability"
          label="Member accountability"
          icon={LineChart}
          active={accountabilityActive}
        />
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

      <div className="mt-auto border-t border-white/6 px-2 py-1 md:py-3 md:pb-6">
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
    </>
  );

  return (
    <div className="relative z-10 flex h-dvh min-h-0 w-full max-w-full flex-col overflow-hidden md:flex-row">
      <Sheet open={open} onOpenChange={setOpen}>
        <header className="flex shrink-0 items-center justify-between border-b border-white/6 bg-[#080c18] px-4 py-3 md:hidden">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-white/35 uppercase">
              CARSI
            </p>
            <p className="text-sm font-semibold text-white/95">Admin</p>
          </div>
          <div className="flex items-center gap-2">
            <ViewModeToggle tone="dark" />
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            </SheetTrigger>
          </div>
        </header>
        <SheetContent
          side="left"
          aria-modal="true"
          aria-describedby={undefined}
          className="scrollbar-glass flex w-[min(100%,280px)] flex-col gap-0 overflow-hidden border-white/6 bg-[#080c18] p-0 text-white motion-reduce:animate-none motion-reduce:transition-none"
        >
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>
      <aside
        className="scrollbar-glass hidden w-full shrink-0 flex-col overflow-hidden md:flex md:h-full md:w-[240px]"
        style={{
          background: 'rgba(8, 12, 24, 0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {sidebar}
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
