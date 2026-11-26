'use client';

import { AlertCircle, BookOpen, Compass, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';
import { cn } from '@/lib/utils';
import type { LearnerLearningJourneyPayload } from '@/types/learner-learning-journey';

const linkClass =
  'group block rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5 transition hover:border-sky-300 hover:bg-sky-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500';

type Props = {
  courseSlug?: string;
  variant?: 'sidebar' | 'dashboard';
  className?: string;
  /** When provided (e.g. server-rendered home), skip client fetch. */
  initialJourney?: LearnerLearningJourneyPayload | null;
};

function hasJourneyContent(journey: LearnerLearningJourneyPayload): boolean {
  return (
    journey.activity_nudges.length > 0 ||
    journey.skill_gaps.length > 0 ||
    Boolean(journey.pathway_next) ||
    journey.course_recommendations.length > 0
  );
}

function courseCatalogHref(slug: string): string {
  return `/dashboard/courses/${encodeURIComponent(slug)}`;
}

export function LearnerLearningJourneyPanel({
  courseSlug,
  variant = 'sidebar',
  className = '',
  initialJourney = undefined,
}: Props) {
  const [journey, setJourney] = useState<LearnerLearningJourneyPayload | null>(
    initialJourney ?? null
  );
  const [loading, setLoading] = useState(initialJourney === undefined);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (initialJourney !== undefined) return;
    let cancelled = false;
    const qs = courseSlug ? `?course=${encodeURIComponent(courseSlug)}` : '';
    void apiClient
      .get<LearnerLearningJourneyPayload>(`/api/lms/recommendations/learning-journey${qs}`)
      .then((data) => {
        if (!cancelled) {
          setJourney(data);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJourney(null);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseSlug, initialJourney]);

  const surface =
    variant === 'dashboard'
      ? 'learner-home-surface learner-home-card rounded-[1.25rem] p-5 sm:p-6'
      : 'rounded-[1.25rem] border border-sky-200/25 bg-gradient-to-b from-sky-50/90 to-white p-4 shadow-sm ring-1 ring-sky-100/80';

  if (loading) {
    return (
      <div className={cn(surface, className)} role="status" aria-live="polite" aria-busy="true">
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/80" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-slate-100" />
        <p className="sr-only">Preparing your learning journey</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn(surface, className)} role="alert">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          We could not load personalised steps. Refresh or continue from the course outline.
        </p>
      </div>
    );
  }

  if (!journey || !hasJourneyContent(journey)) return null;

  return (
    <aside
      className={cn(surface, className)}
      data-testid="learner-learning-journey"
      aria-label="Your learning journey"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" aria-hidden />
        <div className="min-w-0">
          <p
            className={
              variant === 'dashboard'
                ? 'text-[11px] font-semibold tracking-[0.18em] text-sky-300/90 uppercase'
                : dash.eyebrow
            }
          >
            Smart learning
          </p>
          {journey.headline ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{journey.headline}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">Personalised next steps for your enrolled courses.</p>
          )}
        </div>
      </div>

      {journey.activity_nudges.length > 0 ? (
        <section className="mt-4" aria-labelledby="journey-activities-heading">
          <h3
            id="journey-activities-heading"
            className="text-xs font-semibold tracking-wide text-slate-500 uppercase"
          >
            Practice &amp; progress
          </h3>
          <ul className="mt-2 space-y-2">
            {journey.activity_nudges.slice(0, 3).map((n) => (
              <li key={n.id}>
                <Link href={n.href} className={linkClass}>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    {n.kind === 'interactive' ? (
                      <Target className="h-3.5 w-3.5 text-sky-600" aria-hidden />
                    ) : n.kind === 'quiz' ? (
                      <BookOpen className="h-3.5 w-3.5 text-sky-600" aria-hidden />
                    ) : (
                      <Compass className="h-3.5 w-3.5 text-sky-600" aria-hidden />
                    )}
                    {n.title}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-slate-600">{n.reason}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {journey.skill_gaps.length > 0 ? (
        <section className="mt-4" aria-labelledby="journey-gaps-heading">
          <h3
            id="journey-gaps-heading"
            className="text-xs font-semibold tracking-wide text-amber-800/80 uppercase"
          >
            Focus areas
          </h3>
          <ul className="mt-2 space-y-2">
            {journey.skill_gaps.map((g) => (
              <li
                key={g.id}
                className="rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-950"
              >
                <p className="font-semibold tabular-nums">
                  {g.quiz_title} · {g.score_percent}%
                </p>
                <p className="mt-1 text-amber-900/90">{g.reason}</p>
                <Link
                  href={g.href}
                  className="mt-2 inline-flex text-[13px] font-semibold text-amber-950 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                >
                  Revisit lesson
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {journey.pathway_next ? (
        <section className="mt-4 border-t border-slate-200/80 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Pathway</p>
          <Link
            href={courseCatalogHref(journey.pathway_next.slug)}
            className="mt-2 block text-sm font-semibold text-[#146fc2] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            {journey.pathway_next.title}
          </Link>
          <p className="mt-1 text-xs leading-snug text-slate-600">{journey.pathway_next.reason}</p>
        </section>
      ) : null}

      {variant === 'sidebar' && journey.course_recommendations[0] ? (
        <section className="mt-4 border-t border-slate-200/80 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Also consider</p>
          <Link
            href={courseCatalogHref(journey.course_recommendations[0].slug)}
            className="mt-2 block text-sm font-semibold text-slate-900 hover:text-[#146fc2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            {journey.course_recommendations[0].title}
          </Link>
          <p className="mt-1 text-xs leading-snug text-slate-600">
            {journey.course_recommendations[0].reason}
          </p>
        </section>
      ) : null}
    </aside>
  );
}