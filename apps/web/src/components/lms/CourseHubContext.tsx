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
 * CourseHubContext — sidebar widget for course detail pages.
 *
 * Fetches career/hub context for a given course and renders a "Career
 * Opportunities" panel with job-keyword tags that link to the Hub job board.
 *
 * Design: glass panel (#060a14 bg, white/6 border), #2490ed keyword badges.
 */
export function CourseHubContext({ slug }: CourseHubContextProps) {
  const [data, setData] = useState<HubContextData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backendUrl = getBackendOrigin();

    fetch(`${backendUrl}/api/lms/hub/course-context/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: HubContextData | null) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading || !data || data.job_keywords.length === 0) return null;

  return (
    <aside
      className="rounded-sm border border-white/[0.06] bg-[#060a14] p-5"
      aria-label="Career opportunities for this discipline"
    >
      <h3 className="mb-3 text-xs font-semibold tracking-widest text-white/40 uppercase">
        Career Opportunities
      </h3>

      {data.pathway_name && (
        <p className="mb-3 text-sm font-medium text-white/80">{data.pathway_name}</p>
      )}

      <ul className="flex flex-wrap gap-2" aria-label="Related job keywords">
        {data.job_keywords.map((keyword) => (
          <li key={keyword}>
            <a
              href={`/hub/jobs?q=${encodeURIComponent(keyword)}`}
              className="inline-block rounded-sm bg-[#2490ed]/10 px-2.5 py-1 text-xs font-medium text-[#2490ed] transition-colors hover:bg-[#2490ed]/20"
            >
              {keyword}
            </a>
          </li>
        ))}
      </ul>

      {data.related_disciplines.length > 1 && (
        <p className="mt-4 text-xs text-white/30">
          Also relevant to:{' '}
          <span className="text-white/50">
            {data.related_disciplines.filter((d) => d !== data.discipline).join(', ')}
          </span>
        </p>
      )}
    </aside>
  );
}
