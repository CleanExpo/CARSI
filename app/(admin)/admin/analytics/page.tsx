import { Activity, BarChart3 } from 'lucide-react';

import { AdminCohortAnalytics } from '@/components/admin/AdminCohortAnalytics';
import { AdminCrmEvents } from '@/components/admin/AdminCrmEvents';
import { adminGlassCard } from '@/components/admin/admin-learner-ui';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Analytics | Admin | CARSI',
};

export default function AdminAnalyticsPage() {
  return (
    <div className="relative space-y-10 px-6 py-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-60"
        aria-hidden
        style={{
          background:
            'radial-gradient(800px 320px at 12% 0%, rgba(36, 144, 237, 0.18), transparent 60%), radial-gradient(600px 280px at 88% 10%, rgba(34, 211, 238, 0.08), transparent 55%)',
        }}
      />

      <header className={cn(adminGlassCard, 'overflow-hidden p-0')}>
        <div className="border-b border-white/[0.06] bg-gradient-to-br from-[#2490ed]/12 via-transparent to-transparent px-6 py-8 sm:px-8">
          <div className="flex flex-wrap items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2490ed]/30 bg-[#2490ed]/10"
            >
              <BarChart3 className="h-6 w-6 text-[#7ec5ff]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Analytics & CRM</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/50">
                Cohort completion for B2B customers, enrollment trends, and outbound CRM webhook activity — visualised
                in real time from your LMS data.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#7ec5ff]" />
          <h2 className="text-lg font-semibold text-white">Learning cohorts</h2>
        </div>
        <AdminCohortAnalytics />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#7ec5ff]" />
          <h2 className="text-lg font-semibold text-white">CRM sync log</h2>
        </div>
        <AdminCrmEvents />
      </section>
    </div>
  );
}
