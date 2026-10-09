'use client';

import {
  ExternalLink,
  GraduationCap,
  LifeBuoy,
  LogOut,
  Menu,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { CoachingPortalProvider } from '@/components/coaching-portal/CoachingPortalContext';
import { COACHING_PORTAL_NAV_MAIN } from '@/components/coaching-portal/coaching-portal-nav';
import { openCoachingSupportEmail } from '@/lib/coaching-portal/support-contact';
import type { CoachingPortalDashboard } from '@/lib/server/carsi-coaching-portal-dashboard';

function navActive(pathname: string, href: string): boolean {
  if (href === '/coaching') return pathname === '/coaching';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={`group relative flex items-center gap-3 rounded-lg py-2.5 pr-3 pl-3 text-[13px] font-medium transition-[background-color,color] duration-150 ${
          active
            ? 'bg-white/[0.08] text-white'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
        }`}
      >
        {active ? (
          <span
            className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#2490ed]"
            aria-hidden
          />
        ) : null}
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-sky-300' : 'text-slate-500 group-hover:text-slate-300'}`}
          aria-hidden
          strokeWidth={active ? 2.25 : 2}
        />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}

function SidebarFooterLink({
  href,
  label,
  icon: Icon,
  external,
  onClick,
}: {
  href?: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  onClick?: () => void;
}) {
  const className =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-200';

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} text-left`}>
        <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        {label}
      </button>
    );
  }

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {external ? <ExternalLink className="h-3 w-3 shrink-0 opacity-50" aria-hidden /> : null}
    </>
  );

  if (href?.startsWith('mailto:')) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href!}
      className={className}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      {content}
    </Link>
  );
}

export function CoachingPortalShell({
  dashboard,
  children,
}: {
  dashboard: CoachingPortalDashboard;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen, closeDrawer]);

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/[0.06] px-4 pt-5 pb-4">
        <Link
          href="/coaching"
          className="flex items-center gap-3 rounded-lg ring-[#2490ed]/0 transition-shadow outline-none focus-visible:ring-2"
          onClick={closeDrawer}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/10">
            <Image
              src="/logo/logo1.png"
              alt="CARSI"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-white">CARSI</p>
            <p className="text-[11px] font-medium tracking-wide text-slate-500">
              Business Coaching
            </p>
          </div>
        </Link>
      </div>

      <nav
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5"
        aria-label="Coaching workspace"
      >
        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-slate-600 uppercase">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {COACHING_PORTAL_NAV_MAIN.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={navActive(pathname, item.href)}
              onNavigate={closeDrawer}
            />
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/[0.06] bg-[#080d18]/80 p-3">
        <p className="mb-2 truncate px-2.5 text-[11px] text-slate-600" title={dashboard.user.email}>
          Signed in as {dashboard.user.displayName}
        </p>
        <div className="space-y-0.5">
          <SidebarFooterLink href="/dashboard/student/profile" label="My profile" icon={User} />
          <SidebarFooterLink href="/dashboard/settings" label="Account settings" icon={Settings} />
          <SidebarFooterLink
            label="Contact support"
            icon={LifeBuoy}
            onClick={() => openCoachingSupportEmail()}
          />
          <SidebarFooterLink href="/dashboard/student" label="My Learning" icon={GraduationCap} />
          <SidebarFooterLink label="Sign out" icon={LogOut} onClick={() => void signOut()} />
        </div>
      </div>
    </div>
  );

  const sidebarSurface =
    'border-r border-white/[0.06] bg-[#0a1020] bg-gradient-to-b from-[#0d1528] via-[#0a1020] to-[#080d18]';

  return (
    <CoachingPortalProvider dashboard={dashboard}>
      <div className="flex min-h-[100dvh] bg-[#060a14] text-slate-100">
        <aside
          className={`hidden h-[100dvh] w-[250px] shrink-0 ${sidebarSurface} lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:flex-col`}
        >
          {sidebarContent}
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
              aria-label="Close menu"
              onClick={closeDrawer}
            />
            <aside
              className={`relative flex h-full w-[min(100%,280px)] flex-col shadow-2xl ${sidebarSurface}`}
            >
              {sidebarContent}
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[250px]">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.06] bg-[#060a14]/90 px-4 py-3 backdrop-blur-md lg:hidden">
            <button
              type="button"
              className="rounded-lg border border-white/10 p-2 text-slate-200 transition-colors hover:bg-white/5"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Image
              src="/logo/logo1.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
            <p className="text-sm font-semibold text-white">Business Coaching</p>
          </header>

          <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>
    </CoachingPortalProvider>
  );
}
