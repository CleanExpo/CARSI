'use client';

import {
  Award,
  BookOpen,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Route,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { getDashboardSectionLabel, isDashboardNavActive } from '@/lib/dashboard-nav-active';
import { disciplineToken } from '@/lib/discipline-tokens';

// GP-364: colours resolved from discipline tokens at render time.
const disciplines = [
  { code: 'WRT', label: 'Water' },
  { code: 'ASD', label: 'Structural drying' },
  { code: 'AMRT', label: 'Microbial' },
  { code: 'FSRT', label: 'Fire & smoke' },
  { code: 'CCT', label: 'Commercial carpet' },
] as const;

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  instructorOnly?: boolean;
};

const primaryNav: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/courses', label: 'Browse courses', icon: BookOpen },
  { href: '/dashboard/student', label: 'My learning', icon: GraduationCap },
  { href: '/dashboard/student/profile', label: 'Profile', icon: User },
  { href: '/dashboard/student/credentials', label: 'Certificates', icon: Award },
  { href: '/dashboard/pathways', label: 'Pathways', icon: Route },
];

export function LMSContextPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isAdmin = user?.roles?.includes('admin') ?? false;
  const isInstructor = isAdmin || (user?.roles?.includes('instructor') ?? false);
  const section = getDashboardSectionLabel(pathname);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <aside
      className="scrollbar-glass z-10 hidden h-screen max-h-screen w-[min(100%,240px)] shrink-0 flex-col overflow-hidden overscroll-none border-r border-white/6 md:flex md:flex-col"
      style={{
        background: 'rgba(8, 12, 24, 0.82)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      }}
    >
      {/* Fixed header — does not scroll */}
      <div className="shrink-0 border-b border-white/6 px-4 py-5">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-white/35 uppercase">CARSI</p>
        <p className="mt-1.5 text-[15px] font-semibold tracking-tight text-white/95">{section}</p>
        <p className="mt-1 text-xs leading-snug text-white/40">Learning workspace</p>
      </div>

      {/* Scrollable: menu + filters only; sidebar shell stays fixed */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-4 [scrollbar-gutter:stable]">
        <nav className="flex flex-col gap-0.5" aria-label="Section navigation">
          <p className="mb-2 px-2 text-[10px] font-semibold tracking-wider text-white/30 uppercase">
            Menu
          </p>
          {primaryNav.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            if (item.instructorOnly && !isInstructor) return null;
            const active = isDashboardNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
                style={
                  active
                    ? {
                        background: 'rgba(36, 144, 237, 0.14)',
                        color: '#7ec5ff',
                        border: '1px solid rgba(36, 144, 237, 0.22)',
                      }
                    : {
                        color: 'rgba(255, 255, 255, 0.62)',
                        border: '1px solid transparent',
                      }
                }
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {active ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2490ed]" aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-white/6 pt-4">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-semibold tracking-wider text-white/35 uppercase transition hover:bg-white/4"
          >
            <span>Filter by discipline</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          {filtersOpen ? (
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 pl-1">
              {disciplines.map((d) => {
                const color = disciplineToken(d.code) ?? 'hsl(var(--discipline-water-500))';
                return (
                  <Link
                    key={d.code}
                    href={`/dashboard/courses?discipline=${d.code}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/55 transition hover:bg-white/4 hover:text-white/80"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-[10px] font-bold" style={{ color }}>
                      {d.code}
                    </span>
                    <span className="truncate">{d.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Fixed footer — sign out always visible */}
      <div className="shrink-0 border-t border-white/6 px-2 py-3">
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
  );
}
