'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { ChevronRight, UserCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardSettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8 text-sm text-white/50">
        Sign in to view settings.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-16">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-medium text-[#7ec5ff] hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-2 text-sm text-white/50">
          Manage your account and IICRC details in one place.
        </p>
      </div>

      <ul className="space-y-3">
        <li>
          <Link
            href="/dashboard/student/profile"
            className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/3 p-4 transition hover:border-white/15 hover:bg-white/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/6 text-[#7ec5ff]">
              <UserCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-white">Profile &amp; account</span>
              <span className="mt-0.5 block text-xs text-white/45">
                Name, email, IICRC details, and renewal tracking.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/25" aria-hidden />
          </Link>
        </li>
      </ul>
    </div>
  );
}
