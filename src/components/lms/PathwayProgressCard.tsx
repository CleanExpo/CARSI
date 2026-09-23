'use client';

import { Route } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';

interface PathwayProgress {
  pathway_id: string;
  slug: string;
  title: string;
  description: string | null;
  target_certification: string | null;
  courses_total: number;
  courses_completed: number;
  progress_percent: number;
  courses?: Array<{ enrolled?: boolean }>;
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

  const active = pathways.filter((p) => (p.courses ?? []).some((c) => c.enrolled === true));

  if (loading || active.length === 0) {
    return null;
  }

  return (
    <section className="learner-home-surface learner-home-card overflow-hidden rounded-[1.25rem] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-sky-300" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight text-white">Your pathways</h2>
        </div>
        <Link
          href="/dashboard/pathways"
          className="text-xs font-medium text-sky-200 hover:text-white"
        >
          View all
        </Link>
      </div>
      <ul className="space-y-4">
        {pathways.slice(0, 3).map((p) => (
          <li key={p.pathway_id}>
            <Link
              href={`/pathways/${p.slug}`}
              className="learner-home-inset block rounded-xl p-4 transition hover:border-sky-200/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">{p.title}</p>
                  {p.target_certification ? (
                    <p className="mt-0.5 text-xs text-slate-300/80">{p.target_certification}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-semibold text-sky-200 tabular-nums">
                  {p.progress_percent}%
                </span>
              </div>
              <div className="learner-home-bar mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <i
                  className="rounded-full bg-gradient-to-r from-sky-300 to-[#2490ed]"
                  style={{ width: `${p.progress_percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {p.courses_completed} of {p.courses_total} courses complete
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
