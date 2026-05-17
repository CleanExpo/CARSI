'use client';

import Link from 'next/link';
import { Route } from 'lucide-react';
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
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-white/45">Loading pathway progress…</p>
      </section>
    );
  }

  if (pathways.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-start gap-3">
          <Route className="mt-0.5 h-5 w-5 shrink-0 text-[#2490ed]" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-white">Certification pathways</h2>
            <p className="mt-1 text-sm text-white/50">
              Structured IICRC journeys will appear here once pathways are linked to courses.
            </p>
            <Link
              href="/dashboard/pathways"
              className="mt-3 inline-block text-sm font-medium text-[#7ec5ff] hover:underline"
            >
              Explore pathways
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-[#2490ed]" aria-hidden />
          <h2 className="text-lg font-semibold text-white">Your pathways</h2>
        </div>
        <Link
          href="/dashboard/pathways"
          className="text-xs font-medium text-[#7ec5ff] hover:underline"
        >
          View all
        </Link>
      </div>
      <ul className="space-y-4">
        {pathways.slice(0, 3).map((p) => (
          <li key={p.pathway_id}>
            <Link
              href={`/pathways/${p.slug}`}
              className="block rounded-xl border border-white/8 bg-white/[0.02] p-4 transition-colors hover:border-[#2490ed]/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">{p.title}</p>
                  {p.target_certification ? (
                    <p className="mt-0.5 text-xs text-white/45">{p.target_certification}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#7ec5ff]">
                  {p.progress_percent}%
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#2490ed] transition-all"
                  style={{ width: `${p.progress_percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/40">
                {p.courses_completed} of {p.courses_total} courses complete
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
