'use client';

import { BookOpen, Compass, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';
import { cn } from '@/lib/utils';
import type { LearnerLearningJourneyPayload } from '@/types/learner-learning-journey';

type Props = {
  courseSlug?: string;
  variant?: 'sidebar' | 'dashboard';
  className?: string;
};

export function LearnerLearningJourneyPanel({ courseSlug, variant = 'sidebar', className = '' }: Props) {
  const [journey, setJourney] = useState<LearnerLearningJourneyPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const qs = courseSlug ? `?course=${encodeURIComponent(courseSlug)}` : '';
    void apiClient
      .get<LearnerLearningJourneyPayload>(`/api/lms/recommendations/learning-journey${qs}`)
      .then((data) => {
        if (!cancelled) setJourney(data);
      })
      .catch(() => {
        if (!cancelled) setJourney(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseSlug]);

  const surface =
    variant === 'dashboard'
      ? 'learner-home-surface learner-home-card rounded-[1.25rem] p-5 sm:p-6'
      : 'rounded-[1.25rem] border border-sky-200/25 bg-gradient-to-b from-sky-50/80 to-white p-4 shadow-sm';

  if (loading) {
    return (
      <div className={cn(surface, className)} role="status" aria-live="polite">
        <p className="text-sm text-slate-500">Preparing your learning journey…</p>
      </div>
    );
  }

  if (!journey) return null;

  const hasContent =
    journey.activity_nudges.length > 0 ||
    journey.skill_gaps.length > 0 ||
    journey.pathway_next ||
    journey.course_recommendations.length > 0;

  if (!hasContent) return null;

  return (
    <aside
      className={cn(surface, className)}
      data-testid="learner-learning-journey"
      aria-label="Your learning journey"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" aria-hidden />
        <div className="min-w-0">
          <p className={variant === 'dashboard' ? 'text-[11px] font-semibold tracking-[0.18em] text-sky-300/90 uppercase' : dash.eyebrow}>
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
          <h3 id="journey-activities-heading" className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Practice &amp; progress
          </h3>
          <ul className="mt-2 space-y-2">
            {journey.activity_nudges.slice(0, 3).map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href}
                  className="group block rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5 transition hover:border-sky-300 hover:bg-sky-50/50"
                >
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
          <h3 id="journey-gaps-heading" className="text-xs font-semibold tracking-wide text-amber-800/80 uppercase">
            Focus areas
          </h3>
          <ul className="mt-2 space-y-2">
            {journey.skill_gaps.map((g) => (
              <li key={g.id} className="rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-950">
                <p className="font-semibold">
                  {g.quiz_title} · {g.score_percent}%
                </p>
                <p className="mt-1 text-amber-900/90">{g.reason}</p>
                <Link href={g.href} className="mt-2 inline-flex text-[13px] font-semibold text-amber-950 underline-offset-2 hover:underline">
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
            href={`/courses/${encodeURIComponent(journey.pathway_next.slug)}`}
            className="mt-2 block text-sm font-semibold text-[#146fc2] hover:underline"
          >
            {journey.pathway_next.title}
          </Link>
          <p className="mt-1 text-xs text-slate-600">{journey.pathway_next.reason}</p>
        </section>
      ) : null}

      {variant === 'sidebar' && journey.course_recommendations[0] ? (
        <section className="mt-4 border-t border-slate-200/80 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Also consider</p>
          <Link
            href={`/courses/${encodeURIComponent(journey.course_recommendations[0].slug)}`}
            className="mt-2 block text-sm font-semibold text-slate-900 hover:text-[#146fc2]"
          >
            {journey.course_recommendations[0].title}
          </Link>
          <p className="mt-1 text-xs text-slate-600">{journey.course_recommendations[0].reason}</p>
        </section>
      ) : null}
    </aside>
  );
}