'use client';

import type { RenewalCourseSuggestion } from '@/types/renewal';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { dash } from '@/lib/dashboard-light-ui';

export function PopularForYouStrip({ courses }: { courses: RenewalCourseSuggestion[] }) {
  const shown = courses.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <section aria-label="Recommended for you">
      <h2 className={dash.h2}>Recommended for you</h2>
      <p className={`mt-1 ${dash.muted}`}>Based on your courses and learning interests.</p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <li key={c.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
            {c.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.thumbnail_url}
                alt=""
                className="mb-3 h-28 w-full rounded-lg object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="mb-3 h-28 w-full rounded-lg bg-slate-100" aria-hidden />
            )}
            <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {c.cec_hours != null && c.cec_hours > 0 ? <span>{c.cec_hours} CEC</span> : null}
            </div>
            <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{c.title}</h3>
            {c.description || c.reason ? (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description || c.reason}</p>
            ) : null}
            <Link
              href={`/dashboard/courses/${encodeURIComponent(c.slug)}`}
              className={`mt-4 ${dash.btnSecondary} justify-center`}
            >
              View course
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
