'use client';

import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, TrendingUp, Users } from 'lucide-react';

interface CohortSummary {
  total_enrollments: number;
  active_learners_30d: number;
  completions_30d: number;
  courses: Array<{
    course_id: string;
    course_title: string;
    course_slug: string;
    discipline: string | null;
    enrollments_total: number;
    enrollments_completed: number;
    completion_rate_percent: number;
    enrollments_last_30_days: number;
  }>;
  by_discipline: Array<{
    discipline: string;
    enrollments: number;
    completed: number;
  }>;
}

export function AdminCohortAnalytics() {
  const [data, setData] = useState<CohortSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics/cohorts', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json() as Promise<CohortSummary>;
      })
      .then(setData)
      .catch(() => setError('Could not load cohort analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-white/50">Loading cohort analytics…</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-red-300">{error ?? 'No data'}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-[#2490ed]">
            <Users className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Enrollments</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{data.total_enrollments}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Active (30d)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{data.active_learners_30d}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-orange-300">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Completions (30d)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{data.completions_30d}</p>
        </div>
      </div>

      {data.by_discipline.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-white/80">By discipline</h2>
          <div className="flex flex-wrap gap-2">
            {data.by_discipline.map((d) => (
              <span
                key={d.discipline}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70"
              >
                {d.discipline}: {d.enrollments} enrolled · {d.completed} completed
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
          <BookOpen className="h-4 w-4" />
          Course cohorts
        </h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs text-white/45 uppercase">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Discipline</th>
                <th className="px-4 py-3">Enrolled</th>
                <th className="px-4 py-3">30d new</th>
                <th className="px-4 py-3">Completion %</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.slice(0, 40).map((c) => (
                <tr key={c.course_id} className="border-b border-white/6 text-white/75">
                  <td className="max-w-[240px] truncate px-4 py-2.5 font-medium">{c.course_title}</td>
                  <td className="px-4 py-2.5">{c.discipline ?? '—'}</td>
                  <td className="px-4 py-2.5 tabular-nums">{c.enrollments_total}</td>
                  <td className="px-4 py-2.5 tabular-nums">{c.enrollments_last_30_days}</td>
                  <td className="px-4 py-2.5 tabular-nums">{c.completion_rate_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
