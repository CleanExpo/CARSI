'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { dash } from '@/lib/dashboard-light-ui';

/** Mirrors `ResumeSnapshot` from learner dashboard API — kept client-local to avoid server imports. */
export type ContinueLearningSnapshot = {
  course_slug: string;
  course_title: string;
  lesson_id: string;
  lesson_title: string;
  resume_href: string;
  last_accessed_at: string;
};

export function ContinueLearningBanner({
  snapshot,
  progressPercent,
}: {
  snapshot: ContinueLearningSnapshot | null;
  progressPercent?: number | null;
}) {
  if (!snapshot) return null;

  const pct =
    typeof progressPercent === 'number' && Number.isFinite(progressPercent)
      ? Math.min(100, Math.max(0, Math.round(progressPercent)))
      : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8" aria-label="Continue learning">
      <p className={dash.eyebrow}>Continue learning</p>
      <h2 className={`mt-2 ${dash.h2}`}>{snapshot.course_title}</h2>
      {pct != null ? (
        <>
          <p className="mt-2 text-sm tabular-nums text-slate-600">{pct}% complete</p>
          <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#2490ed]" style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : null}
      <p className="mt-3 text-sm text-slate-600">
        Next lesson
        {snapshot.lesson_title ? (
          <span className="font-medium text-slate-900"> {snapshot.lesson_title}</span>
        ) : null}
      </p>
      <Link href={snapshot.resume_href} className={`mt-5 ${dash.btnPrimary}`}>
        Continue learning
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
