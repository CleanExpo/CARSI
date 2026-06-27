'use client';

import { BarChart3, TrendingUp, UserCheck, Users } from 'lucide-react';
import Link from 'next/link';

import { dash } from '@/lib/dashboard-light-ui';

export type SupervisorMemberProgress = {
  userId: string;
  fullName: string | null;
  email: string;
  enrolled: boolean;
  progressPercent: number;
  completed: boolean;
};

type Props = {
  programTitle: string;
  programSlug: string;
  members: SupervisorMemberProgress[];
  isOwner: boolean;
};

export function OnboardingSupervisorDashboard({
  programTitle,
  programSlug,
  members,
  isOwner,
}: Props) {
  const enrolled = members.filter((m) => m.enrolled);
  const avgProgress =
    enrolled.length > 0
      ? Math.round(enrolled.reduce((s, m) => s + m.progressPercent, 0) / enrolled.length)
      : 0;
  const certified = enrolled.filter((m) => m.completed).length;
  const gaps = enrolled.filter((m) => m.enrolled && m.progressPercent < 50).length;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className={dash.eyebrow}>Supervisor &amp; organisation</p>
        <h1 className={dash.h1}>Team training insights</h1>
        <p className={dash.lead}>
          Monitor participation and completion for{' '}
          <span className="font-medium text-slate-800">{programTitle}</span>. Designed for facility
          managers who need visibility without complexity.
        </p>
      </header>

      {!isOwner ? (
        <div className={`${dash.cardInset} border-amber-200 bg-amber-50 p-4 text-sm text-amber-900`}>
          You are viewing this program as a learner. Team analytics are available to organisation
          owners — visit{' '}
          <Link href="/dashboard/team" className="font-medium underline">
            Team settings
          </Link>{' '}
          to manage members.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, label: 'Team members', value: String(members.length) },
          { icon: UserCheck, label: 'Enrolled', value: String(enrolled.length) },
          { icon: TrendingUp, label: 'Avg. progress', value: `${avgProgress}%` },
          { icon: BarChart3, label: 'Completed', value: String(certified) },
        ].map((stat) => (
          <div key={stat.label} className={dash.statCard}>
            <stat.icon className="mb-2 h-5 w-5 text-[#146fc2]" aria-hidden />
            <p className={dash.statLabel}>{stat.label}</p>
            <p className={dash.statValue}>{stat.value}</p>
          </div>
        ))}
      </div>

      {gaps > 0 ? (
        <div className={`${dash.cardInset} border-[#ed9d24]/30 bg-[#fff8ef] px-4 py-3 text-sm text-slate-700`}>
          <strong className="text-slate-900">{gaps}</strong> enrolled learner
          {gaps === 1 ? '' : 's'} below 50% progress — consider a supervisor check-in or scheduled
          training block.
        </div>
      ) : null}

      <div className={dash.panel}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Employee participation</h2>
          <Link href="/dashboard/team" className={dash.btnSecondary}>
            Manage team
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
                <th className="px-6 py-3 font-medium">Learner</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                    No team members yet. Invite staff from Team settings.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.userId} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{m.fullName ?? m.email}</p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {!m.enrolled ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          Not enrolled
                        </span>
                      ) : m.completed ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                          Complete
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#eef7ff] px-2.5 py-0.5 text-xs font-medium text-[#146fc2]">
                          In training
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#2490ed]"
                            style={{ width: `${m.progressPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-slate-600">{m.progressPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Program: <code className="rounded bg-slate-100 px-1">{programSlug}</code> · Detailed admin
        reports available under Admin → Users for full audit trails.
      </p>
    </div>
  );
}
