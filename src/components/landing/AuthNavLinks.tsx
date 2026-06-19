'use client';

import Link from 'next/link';

import { useAuth } from '@/components/auth/auth-provider';

type Variant = 'desktop' | 'mobile';

export function AuthNavLinks({
  variant,
  onNavigate,
}: {
  variant: Variant;
  /** Close mobile menu after navigation */
  onNavigate?: () => void;
}) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    if (variant === 'desktop') {
      return <span className="text-sm text-slate-400" aria-hidden>...</span>;
    }
    return null;
  }

  if (user) {
    const label = user.full_name?.trim() || user.email;
    if (variant === 'desktop') {
      return (
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="max-w-[200px] truncate rounded-md px-2 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none"
            title={label}
          >
            {label}
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md px-2 py-2 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none"
          >
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
        <Link
          href="/login"
          onClick={() => onNavigate?.()}
          className="rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none"
        >
          Sign In
        </Link>
        <Link
          href="/courses"
          onClick={() => onNavigate?.()}
          className="rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#ed9d24]/45 focus-visible:outline-none"
          style={{ background: '#9a4a00' }}
        >
          Browse Courses
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
        Browse Courses
      </Link>
    </div>
  );
}
