'use client';

import {
  Award,
  BookOpen,
  Building2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Route,
  User,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { getDashboardSectionLabel, isDashboardNavActive } from '@/lib/dashboard-nav-active';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const primaryNav: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/onboarding', label: 'Onboarding', icon: Building2 },
  { href: '/dashboard/courses', label: 'Browse courses', icon: BookOpen },
  { href: '/dashboard/student', label: 'My learning', icon: GraduationCap },
  { href: '/dashboard/student/profile', label: 'Profile', icon: User },
  { href: '/dashboard/student/credentials', label: 'Certificates', icon: Award },
  { href: '/dashboard/student/leaderboard', label: 'Recognition', icon: ListOrdered },
  { href: '/dashboard/student/notes', label: 'Notes', icon: FileText },
  { href: '/dashboard/pathways', label: 'Pathways', icon: Route },
  { href: '/dashboard/team', label: 'Team', icon: Users },
];

export function DashboardMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const section = getDashboardSectionLabel(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#146fc2] uppercase">CARSI</p>
          <p className="truncate text-sm font-semibold text-slate-950">{section}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 right-0 flex h-full w-[min(100%,280px)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#146fc2] uppercase">CARSI</p>
                <p className="text-sm font-semibold text-slate-950">Learning workspace</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4" aria-label="Mobile section navigation">
              {primaryNav.map((item) => {
                const active = isDashboardNavActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                    style={
                      active
                        ? { background: '#eef7ff', color: '#146fc2', border: '1px solid #b8dbfb' }
                        : { color: '#475569', border: '1px solid transparent' }
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 p-2">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
                {user?.email ? (
                  <span className="ml-auto truncate text-xs text-slate-400">{user.email}</span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
