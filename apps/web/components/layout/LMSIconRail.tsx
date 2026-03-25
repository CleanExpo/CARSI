'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  BookOpen,
  Award,
  GraduationCap,
  Shield,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { NotificationBell } from '@/components/lms/NotificationBell';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: typeof LayoutDashboard;
  href: string;
  label: string;
  adminOnly?: boolean;
  instructorOnly?: boolean;
}

const topNav: NavItem[] = [
  { icon: LayoutDashboard, href: '/dashboard', label: 'Dashboard' },
  { icon: Search, href: '/courses', label: 'Browse Courses' },
  { icon: BookOpen, href: '/student', label: 'My Learning' },
  { icon: Award, href: '/student/credentials', label: 'Credentials' },
  { icon: GraduationCap, href: '/instructor', label: 'Instructor', instructorOnly: true },
  { icon: Shield, href: '/admin', label: 'Admin', adminOnly: true },
];

export function LMSIconRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const isAdmin = user?.roles?.includes('admin') ?? false;
  const isInstructor = isAdmin || (user?.roles?.includes('instructor') ?? false);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() ?? 'U');

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="relative z-20 flex min-h-screen w-14 flex-shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3">
      {/* CARSI logo mark */}
      <Link
        href="/"
        title="CARSI Home"
        className="mb-3 flex h-9 w-9 flex-shrink-0 items-center justify-center transition-transform hover:scale-105"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/brand/carsi-logo.webp"
          alt="CARSI"
          className="h-7 w-auto"
        />
      </Link>

      {/* Top nav */}
      <nav
        aria-label="Main navigation"
        className="flex w-full flex-col items-center gap-0.5 px-1.5"
      >
        {topNav.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          if (item.instructorOnly && !isInstructor) return null;

          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-sm border transition-colors',
                isActive
                  ? 'border-primary/30 bg-primary/15 text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full z-50 ml-2 rounded-sm border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground whitespace-nowrap opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Bottom nav */}
      <div className="flex w-full flex-col items-center gap-0.5 px-1.5">
        <NotificationBell />
        <Link
          href="/dashboard/settings"
          title="Settings"
          aria-label="Settings"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-sm border border-transparent transition-colors',
            pathname.startsWith('/dashboard/settings')
              ? 'text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
        </Link>

        <button
          onClick={handleSignOut}
          title={`${user?.email ?? 'Account'} — click to sign out`}
          aria-label="Sign out"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground transition-transform hover:scale-105"
        >
          {initials}
        </button>
      </div>
    </aside>
  );
}
