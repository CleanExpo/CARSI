'use client';

import { Route } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';

interface PathwayProgress {
  pathway_id: string;
  slug: string;
  title: string;
  description: string | null;
  target_certification: string | null;
  courses_total: number;
  courses_completed: number;
  progress_percent: number;
}

export function PathwayProgressCard() {
  const [pathways, setPathways] = useState<PathwayProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ pathways: PathwayProgress[] }>('/api/lms/pathways/me/progress')
      .then((data) => setPathways(data.pathways ?? []))
      .catch(() => setPathways([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className={`${dash.card} p-6`}>
        <p className={`text-sm ${dash.muted}`}>Loading pathway progress…</p>
      </section>
    );
  }

  if (pathways.length === 0) {
    return (
      <section className={`${dash.card} p-6`}>
        <div className="flex items-start gap-3">
          <Route className="mt-0.5 h-5 w-5 shrink-0 text-[#2490ed]" aria-hidden />
          <div>
            <h2 className={dash.h2}>Certification pathways</h2>
            <p className={`mt-1 text-sm ${dash.muted}`}>
              Structured IICRC journeys will appear here once pathways are linked to courses.
            </p>
            <Link
              href="/dashboard/pathways"
              className="mt-3 inline-block text-sm font-medium text-[#146fc2] hover:underline"
            >
              Explore pathways
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${dash.card} p-6`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-[#2490ed]" aria-hidden />
          <h2 className={dash.h2}>Your pathways</h2>
        </div>
        <Link
          href="/dashboard/pathways"
          className="text-xs font-medium text-[#146fc2] hover:underline"
        >
          View all
        </Link>
      </div>
      <ul className="space-y-4">
        {pathways.slice(0, 3).map((p) => (
          <li key={p.pathway_id}>
            <Link
              href={`/pathways/${p.slug}`}
              className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-[#2490ed]/30 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{p.title}</p>
                  {p.target_certification ? (
                    <p className={`mt-0.5 text-xs ${dash.muted}`}>{p.target_certification}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-semibold text-[#146fc2] tabular-nums">
                  {p.progress_percent}%
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#2490ed] transition-all"
                  style={{ width: `${p.progress_percent}%` }}
                />
              </div>
              <p className={`mt-2 text-xs ${dash.subtle}`}>
                {p.courses_completed} of {p.courses_total} courses complete
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
