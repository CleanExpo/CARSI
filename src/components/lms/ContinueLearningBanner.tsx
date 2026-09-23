'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

/** Mirrors `ResumeSnapshot` from learner dashboard API — kept client-local to avoid server imports. */
export type ContinueLearningSnapshot = {
  course_slug: string;
  course_title: string;
  lesson_id: string;
  lesson_title: string;
  resume_href: string;
  last_accessed_at: string;
};

const surface =
  'learner-home-surface learner-home-card learner-home-surface--hero overflow-hidden rounded-[1.25rem]';
const kicker =
  'bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-200 bg-clip-text text-[11px] font-semibold tracking-[0.2em] text-transparent uppercase';
const heading = 'font-semibold tracking-[-0.02em] text-white';
const muted = 'text-slate-300/80';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-white via-sky-50 to-white px-5 py-2.5 text-[13px] font-semibold text-slate-950 shadow-[0_10px_28px_-10px_rgba(56,189,248,0.8)] transition hover:from-sky-50 hover:to-white';

export function ContinueLearningBanner({
  snapshot,
  progressPercent,
  description,
  lessonIndex,
  lessonTotal,
}: {
  snapshot: ContinueLearningSnapshot | null;
  progressPercent?: number | null;
  description?: string | null;
  lessonIndex?: number | null;
  lessonTotal?: number | null;
}) {
  if (!snapshot) return null;

  const pct =
    typeof progressPercent === 'number' && Number.isFinite(progressPercent)
      ? Math.min(100, Math.max(0, Math.round(progressPercent)))
      : null;

  return (
    <section className={`${surface} px-6 py-7 sm:px-8`} aria-label="Continue learning">
      <p className={kicker}>
        <span className="learner-home-dot mr-2 inline-block h-1.5 w-1.5 rounded-full bg-sky-300 align-middle" />
        In progress
      </p>
      <h2 className={`mt-3 max-w-3xl text-[1.55rem] leading-tight sm:text-[1.85rem] ${heading}`}>
        {snapshot.course_title}
      </h2>
      {description ? (
        <p className={`mt-3 line-clamp-2 max-w-2xl text-[15px] leading-6 ${muted}`}>
          {description}
        </p>
      ) : null}
      {pct != null ? (
        <>
          <div
            className={`mt-5 flex items-center justify-between gap-3 text-sm tabular-nums ${muted}`}
          >
            <span>{pct}% complete</span>
            {lessonIndex != null && lessonTotal != null && lessonTotal > 0 ? (
              <span>
                Lesson {lessonIndex} of {lessonTotal}
              </span>
            ) : null}
          </div>
          <div className="learner-home-bar mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <i
              className="rounded-full bg-gradient-to-r from-sky-300 to-[#2490ed]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : null}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={kicker}>Next lesson</p>
          <p className="mt-1 text-[15px] font-medium text-white">
            {snapshot.lesson_title || 'Open the next lesson'}
          </p>
        </div>
        <Link href={snapshot.resume_href} className={btn}>
          Continue learning
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
