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

  const isAdmin = user?.is_admin ?? false;
  const isInstructor = isAdmin;

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
      className="relative z-20 flex min-h-screen w-14 flex-shrink-0 flex-col items-center gap-1 py-3"
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
        className="mb-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #2490ed 0%, #38a8ff 100%)',
          boxShadow: '0 0 20px rgba(36, 144, 237, 0.4)',
        }}
      >
        <span className="text-sm leading-none font-bold text-white">C</span>
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

      <div className="flex-1" />

      {/* Bottom nav */}
      <div className="flex w-full flex-col items-center gap-0.5 px-1.5">
        <Link
          href="/dashboard/settings"
          title="Settings"
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200"
          style={{
            color: pathname.startsWith('/dashboard/settings')
              ? '#2490ed'
              : 'rgba(255, 255, 255, 0.35)',
            border: '1px solid transparent',
          }}
        >
          <Settings className="h-4 w-4" />
        </Link>

        <button
          onClick={handleSignOut}
          title={`${user?.email ?? 'Account'} — click to sign out`}
          aria-label="Sign out"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white transition-all duration-200 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #2490ed 0%, #1a7fd4 100%)',
            boxShadow: '0 0 14px rgba(36, 144, 237, 0.35)',
          }}
        >
          {initials}
        </button>
      </div>
    </aside>
  );
}
