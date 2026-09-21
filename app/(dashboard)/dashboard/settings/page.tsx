'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { Bell, ChevronRight, UserCircle } from 'lucide-react';
import Link from 'next/link';

import { dash } from '@/lib/dashboard-light-ui';

export default function DashboardSettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className={`mx-auto max-w-lg p-8 text-sm ${dash.muted}`}>Sign in to view settings.</div>
    );
  }

  return (
    <div className="max-w-9xl mx-auto w-full space-y-8 pb-16">
      <div>
        <Link href="/dashboard" className="text-xs font-medium text-[#146fc2] hover:underline">
          ← Back to Home
        </Link>
        <h1 className={`mt-4 text-2xl font-semibold ${dash.h1}`}>Settings</h1>
        <p className={`mt-2 text-sm ${dash.muted}`}>Account, notifications and privacy.</p>
      </div>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <li>
          <Link
            href="/dashboard/student/profile"
            className="flex items-start gap-4 p-4 transition hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef7ff] text-[#146fc2]">
              <UserCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900">
                Profile &amp; account
              </span>
              <span className={`mt-0.5 block text-xs ${dash.muted}`}>
                Name, email, IICRC details, and renewal tracking.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard/settings/notifications"
            className="flex items-start gap-4 p-4 transition hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef7ff] text-[#146fc2]">
              <Bell className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900">Notifications</span>
              <span className={`mt-0.5 block text-xs ${dash.muted}`}>
                Choose which emails CARSI sends you, including toolbox-talk updates.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard/student/profile#iicrc"
            className="flex items-start gap-4 p-4 transition hover:bg-slate-50"
          >
            <span className="min-w-0 flex-1 pl-14">
              <span className="block text-sm font-medium text-slate-900">Privacy</span>
              <span className={`mt-0.5 block text-xs ${dash.muted}`}>
                IICRC member details and how you appear on Achievements.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard/help"
            className="flex items-start gap-4 p-4 transition hover:bg-slate-50"
          >
            <span className="min-w-0 flex-1 pl-14">
              <span className="block text-sm font-medium text-slate-900">Help</span>
              <span className={`mt-0.5 block text-xs ${dash.muted}`}>
                Common questions and support contact.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </Link>
        </li>
      </ul>
    </div>
  );
}
