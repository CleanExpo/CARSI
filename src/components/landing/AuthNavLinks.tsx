'use client';

import Link from 'next/link';

import { useAuth } from '@/components/auth/auth-provider';

type Variant = 'desktop' | 'mobile';

export function AuthNavLinks({
  variant,
  tone = 'light',
  onNavigate,
}: {
  variant: Variant;
  /** Nav chrome bar uses light text on a dark surface. */
  tone?: 'light' | 'chrome';
  /** Close mobile menu after navigation */
  onNavigate?: () => void;
}) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    if (variant === 'desktop') {
      return (
        <span
          className={`text-sm ${tone === 'chrome' ? 'text-white/55' : 'text-slate-600'}`}
          aria-hidden
        >
          ...
        </span>
      );
    }
    return null;
  }

  const chromeLink =
    'rounded-md px-2 py-2 text-sm font-medium text-white/75 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none';
  const lightLink =
    'rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none';
  const chromeMuted =
    'rounded-md px-2 py-2 text-sm font-medium text-white/55 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none';
  const lightMuted =
    'rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none';
  const dashboardLink = tone === 'chrome' ? chromeLink : lightLink;
  const signOutLink = tone === 'chrome' ? chromeMuted : lightMuted;
  const signInLink = tone === 'chrome' ? chromeLink : lightLink;

  if (user) {
    const label = user.full_name?.trim() || user.email;
    if (variant === 'desktop') {
      return (
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={`max-w-[200px] truncate ${dashboardLink}`}
            title={label}
          >
            {label}
          </Link>
          <button type="button" onClick={() => void signOut()} className={signOutLink}>
            Sign out
          </button>
        </div>
      );
    }

    return (
      <div
        className="mt-4 space-y-2 border-t pt-4"
        style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}
      >
        <div
          className="rounded-md px-4 py-2 text-center text-sm font-medium text-slate-700"
        >
          {label}
        </div>
        <Link
          href="/dashboard"
          onClick={() => onNavigate?.()}
          className="block min-h-11 rounded-md px-4 py-3 text-center text-base font-semibold text-white transition-colors duration-150"
          style={{
            background: '#146fc2',
            border: '1px solid rgba(20, 111, 194, 0.35)',
          }}
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => {
            void signOut();
            onNavigate?.();
          }}
          className="w-full min-h-11 rounded-md px-4 py-3 text-center text-base font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-100"
          style={{
            background: '#f8fafc',
            border: '1px solid rgba(15, 23, 42, 0.12)',
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  if (variant === 'desktop') {
    return (
      <>
        <Link href="/login" onClick={() => onNavigate?.()} className={signInLink}>
          Sign In
        </Link>
        <Link
          href="/courses"
          onClick={() => onNavigate?.()}
          className="rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#ed9d24]/45 focus-visible:outline-none"
          style={{ background: '#9a4a00' }}
        >
          Get started
        </Link>
      </>
    );
  }

  return (
    <div
      className="mt-4 space-y-2 border-t pt-4"
      style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}
    >
      <Link
        href="/login"
        onClick={() => onNavigate?.()}
        className="block min-h-11 rounded-md px-4 py-3 text-center text-base font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-100"
        style={{
          background: '#f8fafc',
          border: '1px solid rgba(15, 23, 42, 0.12)',
        }}
      >
        Sign In
      </Link>
      <Link
        href="/courses"
        onClick={() => onNavigate?.()}
        className="block min-h-11 rounded-md px-4 py-3 text-center text-base font-semibold text-white transition-opacity duration-150 hover:opacity-90"
        style={{ background: '#9a4a00' }}
      >
        Get started
      </Link>
    </div>
  );
}
