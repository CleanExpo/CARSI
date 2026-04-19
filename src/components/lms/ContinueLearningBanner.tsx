'use client';

import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';

/** Mirrors `ResumeSnapshot` from learner dashboard API — kept client-local to avoid server imports. */
export type ContinueLearningSnapshot = {
  course_slug: string;
  course_title: string;
  lesson_id: string;
  lesson_title: string;
  resume_href: string;
  last_accessed_at: string;
};

export function ContinueLearningBanner({ snapshot }: { snapshot: ContinueLearningSnapshot | null }) {
  if (!snapshot) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[#2490ed]/35 bg-gradient-to-br from-[#2490ed]/20 via-[#0a1428] to-transparent px-5 py-6 sm:px-8"
      aria-label="Continue learning"
    >
      <div
        className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-[#2490ed]/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#7ec5ff]"
            aria-hidden
          >
            <PlayCircle className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#7ec5ff]/90 uppercase">
              Continue where you left off
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-white">{snapshot.course_title}</p>
            <p className="mt-0.5 truncate text-sm text-white/50">
              {snapshot.lesson_title ? `Lesson: ${snapshot.lesson_title}` : 'Resume your last lesson'}
            </p>
          </div>
        </div>
        <Link
          href={snapshot.resume_href}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#2490ed] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2490ed]/25 transition hover:bg-[#1f82d4] sm:self-center"
        >
          Resume
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
