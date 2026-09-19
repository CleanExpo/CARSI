'use client';

import { useEffect, useState } from 'react';
import { getBackendOrigin } from '@/lib/env/public-url';

interface HubContextData {
  discipline: string;
  job_keywords: string[];
  related_disciplines: string[];
  pathway_name: string | null;
}

interface CourseHubContextProps {
  discipline: string;
  slug: string;
}

/**
 * Sidebar career context for a public course page — same light panel language as the homepage.
 */
export function CourseHubContext({ slug }: CourseHubContextProps) {
  const [data, setData] = useState<HubContextData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backendUrl = getBackendOrigin().replace(/\/$/, '');
    const path = `/api/lms/hub/course-context/${encodeURIComponent(slug)}`;
    const url = backendUrl ? `${backendUrl}${path}` : path;

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: HubContextData | null) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading || !data || data.job_keywords.length === 0) return null;

  return (
    <aside
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
      aria-label="Career opportunities for this discipline"
    >
      <h3 className="mb-3 text-[11px] font-medium tracking-[0.24em] text-[#146fc2] uppercase">
        Career opportunities
      </h3>

      {data.pathway_name && (
        <p className="mb-3 text-sm font-semibold text-slate-950">{data.pathway_name}</p>
      )}

      <ul className="flex flex-wrap gap-2" aria-label="Related job keywords">
        {data.job_keywords.map((keyword) => (
          <li key={keyword}>
            <a
              href={`/hub/jobs?q=${encodeURIComponent(keyword)}`}
              className="inline-block rounded-full bg-[#eef5fb] px-3 py-1 text-xs font-medium text-[#146fc2] transition-colors hover:bg-[#dbebff]"
            >
              {keyword}
            </a>
          </li>
        ))}
      </ul>

      {data.related_disciplines.length > 1 && (
        <p className="mt-4 text-xs text-slate-500">
          Also relevant to:{' '}
          <span className="text-slate-600">
            {data.related_disciplines.filter((d) => d !== data.discipline).join(', ')}
          </span>
        </p>
      )}
    </aside>
  );
}
