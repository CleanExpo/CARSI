'use client';

import { ArrowRight, Building2, PlayCircle } from 'lucide-react';
import Link from 'next/link';

import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { getOnboardingProgramPath } from '@/lib/onboarding/navigation';

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
}: {
  snapshot: ContinueLearningSnapshot | null;
}) {
  if (!snapshot) return null;

  const onboarding = isOnboardingCourse({ slug: snapshot.course_slug });
  const programHref = getOnboardingProgramPath(snapshot.course_slug);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[#2490ed]/25 bg-gradient-to-br from-[#eef7ff] via-white to-white px-5 py-6 shadow-sm sm:px-8"
      aria-label="Continue learning"
    >
      <div
        className="pointer-events-none absolute top-0 -right-16 h-40 w-40 rounded-full bg-[#2490ed]/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#2490ed]/20 bg-white text-[#146fc2] shadow-sm"
            aria-hidden
          >
            <PlayCircle className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#146fc2] uppercase">
              Continue where you left off
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-slate-900">{snapshot.course_title}</p>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              {snapshot.lesson_title
                ? `Lesson: ${snapshot.lesson_title}`
                : 'Resume your last lesson'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
        <Link
          href={snapshot.resume_href}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#2490ed] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a7fd4] sm:self-center"
        >
          Resume
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        {onboarding ? (
          <Link
            href={programHref}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[#2490ed]/25 bg-white px-5 py-3 text-sm font-semibold text-[#146fc2] transition hover:bg-[#eef7ff] sm:self-center"
          >
            <Building2 className="h-4 w-4" aria-hidden />
            Program hub
          </Link>
        ) : null}
        </div>
      </div>
    </section>
  );
}
