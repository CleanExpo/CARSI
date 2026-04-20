'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { NotificationBell } from '@/components/lms/NotificationBell';
import {
  Award,
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListOrdered,
  Search,
  Settings,
  Shield,
  UserCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { isDashboardNavActive } from '@/lib/dashboard-nav-active';

interface NavItem {
  icon: typeof LayoutDashboard;
  href: string;
  label: string;
  adminOnly?: boolean;
  instructorOnly?: boolean;
}

const topNav: NavItem[] = [
  { icon: LayoutDashboard, href: '/dashboard', label: 'Dashboard' },
  { icon: Search, href: '/dashboard/courses', label: 'Browse Courses' },
  { icon: BookOpen, href: '/dashboard/student', label: 'My Learning' },
  { icon: UserCircle, href: '/dashboard/student/profile', label: 'Profile' },
  { icon: Award, href: '/dashboard/student/credentials', label: 'Credentials' },
  { icon: ListOrdered, href: '/dashboard/student/leaderboard', label: 'Recognition' },
  { icon: FileText, href: '/dashboard/student/notes', label: 'Notes' },
  { icon: GraduationCap, href: '/dashboard/instructor', label: 'Instructor', instructorOnly: true },
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
    <aside
      className="relative z-20 flex h-screen max-h-screen w-14 shrink-0 flex-col overflow-hidden overscroll-none py-3"
      style={{
        background: 'rgba(6, 10, 20, 0.9)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* CARSI logo mark */}
      <Link
        href="/"
        title="CARSI Home"
        className="mb-3 flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg transition-all duration-200 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #2490ed 0%, #38a8ff 100%)',
          boxShadow: '0 0 20px rgba(36, 144, 237, 0.4)',
        }}
      >
        <span className="text-sm leading-none font-bold text-white">C</span>
      </Link>

      {/* Top nav — scrolls if needed; rail shell stays fixed height */}
      <nav
        aria-label="Main navigation"
        className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto overflow-x-hidden px-1.5 [scrollbar-width:thin]"
      >
        {topNav.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          if (item.instructorOnly && !isInstructor) return null;

          const isActive = isDashboardNavActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className="group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200"
              style={
                isActive
                  ? {
                      background: 'rgba(36, 144, 237, 0.2)',
                      color: '#2490ed',
                      boxShadow:
                        '0 0 16px rgba(36, 144, 237, 0.25), inset 0 0 8px rgba(36, 144, 237, 0.1)',
                      border: '1px solid rgba(36, 144, 237, 0.3)',
                    }
                  : {
                      color: 'rgba(255, 255, 255, 0.4)',
                      border: '1px solid transparent',
                    }
              }
            >
              <item.icon className="h-4 w-4" />
              {/* Tooltip */}
              <span
                className="pointer-events-none absolute left-full z-50 ml-2 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                style={{
                  background: 'rgba(12, 18, 36, 0.97)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav — fixed to bottom; middle nav scrolls above */}
      <div className="flex w-full shrink-0 flex-col items-center gap-0.5 border-t border-white/6 px-1.5 pt-2">
        <NotificationBell />
        <Link
          href="/dashboard/settings"
          title="Settings"
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200"
          style={{
            color: isDashboardNavActive(pathname, '/dashboard/settings')
              ? '#2490ed'
              : 'rgba(255, 255, 255, 0.35)',
            border: '1px solid transparent',
          }}
        >
          <Settings className="h-4 w-4" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Account menu"
              aria-label="Open account menu"
              className="mt-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-xs font-bold text-white transition-all duration-200 hover:scale-105 data-[state=open]:ring-2 data-[state=open]:ring-[#2490ed]/50"
              style={{
                background: 'linear-gradient(135deg, #2490ed 0%, #1a7fd4 100%)',
                boxShadow: '0 0 14px rgba(36, 144, 237, 0.35)',
              }}
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="min-w-[220px] border border-white/10 bg-[#0c1220] p-1 text-white shadow-xl"
          >
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-xs text-white/45">{user?.email}</span>
              <span className="mt-0.5 block text-sm font-medium text-white/90">Account</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="cursor-pointer text-white/90 focus:bg-white/10 focus:text-white"
              onClick={() => router.push('/dashboard/student/profile')}
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-white/90 focus:bg-white/10 focus:text-white"
              onClick={() => router.push('/dashboard/settings')}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="cursor-pointer text-red-300 focus:bg-red-500/15 focus:text-red-200"
              onClick={() => void handleSignOut()}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
