'use client';

import { ArrowRight, Compass, Layers, Lock, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import type {
  InteractiveLearningDiscipline,
  InteractiveLearningOffer,
} from '@/lib/lms/interactive-learning-catalog';
import {
  disciplineFilterLabel,
  interactiveLearningPath,
  listInteractiveDisciplines,
} from '@/lib/lms/interactive-learning-catalog';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingPanel,
} from '@/lib/marketing/marketing-ui';
import { cn } from '@/lib/utils';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Discover',
    body: 'Scenario context grounded in Australian jobs — not abstract slides.',
  },
  {
    step: '02',
    title: 'Explore',
    body: 'Diagrams, equipment, and site cues you tap and investigate.',
  },
  {
    step: '03',
    title: 'Decide',
    body: 'Branching judgement with practitioner feedback on every call.',
  },
  {
    step: '04',
    title: 'Progress',
    body: 'Mastery-gated XP inside the lesson; course completion stays on the LMS.',
  },
] as const;

interface InteractiveLearningHubViewProps {
  offers: InteractiveLearningOffer[];
}

export function InteractiveLearningHubView({ offers }: InteractiveLearningHubViewProps) {
  const [filter, setFilter] = useState<InteractiveLearningDiscipline | 'all'>('all');
  const disciplines = useMemo(() => listInteractiveDisciplines(), []);

  const filtered = useMemo(() => {
    if (filter === 'all') return offers;
    return offers.filter((o) => o.discipline === filter);
  }, [filter, offers]);

  const live = filtered.filter((o) => o.status === 'live');
  const upcoming = filtered.filter((o) => o.status === 'coming-soon');

  return (
    <div className="w-full">
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-[#f8fbff] via-white to-[#fafbfc]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 60% at 10% 0%, rgba(36,144,237,0.14), transparent), radial-gradient(ellipse 70% 50% at 90% 10%, rgba(20,111,194,0.1), transparent)',
          }}
        />
        <div className={cn(PUBLIC_SHELL_INNER_CLASS, 'relative py-14 md:py-20 lg:py-24')}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={LANDING_EYEBROW_CLASS}>CARSI interactive practice</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2490ed]/25 bg-[#eef7ff] px-3 py-1 text-[11px] font-semibold text-[#146fc2]">
              <Compass className="h-3.5 w-3.5" aria-hidden />
              Course advisor · all disciplines
            </span>
          </div>
          <h1 className={cn(LANDING_DISPLAY_H2_CLASS, 'mt-5 max-w-4xl lg:text-[3.25rem]')}>
            Investigate, decide, and practise — across every CARSI course path
          </h1>
          <p className={cn(LANDING_LEAD_CLASS, 'mt-5 max-w-2xl text-base md:text-lg')}>
            Interactive layers sit inside real lessons: scenarios, diagrams, and judgement calls
            with feedback. Pick a discipline below — live experiences open now; more courses join
            the same framework as they ship.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#experiences" className={marketingBtnPrimary}>
              Browse experiences
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <Link href="/courses" className={marketingBtnSecondary}>
              Full course catalogue
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200/70 bg-white py-12 md:py-14">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <h2 className="text-center text-sm font-semibold tracking-wide text-slate-500 uppercase">
            How interactive learning works
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <li
                key={item.step}
                className={cn(
                  marketingPanel,
                  'relative overflow-hidden p-5 transition hover:border-[#2490ed]/35 hover:shadow-lg'
                )}
              >
                <span className="font-mono text-xs font-semibold text-[#146fc2]">{item.step}</span>
                <p className="mt-2 text-base font-semibold text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="experiences" className="scroll-mt-20 py-12 md:py-16">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">
                Experience library
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                One framework for water, moisture, microbial, carpet, and indoor environment
                training — same mastery rules, discipline-specific content.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by discipline">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                All
              </FilterChip>
              {disciplines.map((d) => (
                <FilterChip key={d} active={filter === d} onClick={() => setFilter(d)}>
                  {disciplineFilterLabel(d)}
                </FilterChip>
              ))}
            </div>
          </div>

          {live.length > 0 ? (
            <ul className="mt-10 grid gap-6 lg:grid-cols-12">
              {live.map((offer, i) => (
                <li
                  key={offer.experienceId}
                  className={cn(i === 0 ? 'lg:col-span-7' : 'lg:col-span-5', 'min-h-full')}
                >
                  <LiveOfferCard offer={offer} featured={i === 0} />
                </li>
              ))}
            </ul>
          ) : null}

          {upcoming.length > 0 ? (
            <>
              <div className="mt-14 flex items-center gap-2">
                <Layers className="h-5 w-5 text-slate-400" aria-hidden />
                <h3 className="text-lg font-semibold text-slate-900">Rolling out next</h3>
              </div>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((offer) => (
                  <li key={offer.experienceId}>
                    <UpcomingOfferCard offer={offer} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-[#f6f8fb] py-14">
        <div className={cn(PUBLIC_SHELL_INNER_CLASS, 'grid gap-8 lg:grid-cols-2 lg:items-center')}>
          <div>
            <Target className="h-8 w-8 text-[#146fc2]" aria-hidden />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">
              Built for enrolled learners too
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              When you are enrolled, the same activities appear inside the lesson player — progress
              and completion still follow your course record. This hub is your advisor for
              what&apos;s live and what&apos;s next.
            </p>
          </div>
          <Link
            href="/dashboard/learn/water-damage-restoration-fundamentals"
            className={cn(marketingBtnPrimary, 'w-full justify-center sm:w-auto')}
          >
            Open your learning dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-[#146fc2] bg-[#146fc2] text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      )}
    >
      {children}
    </button>
  );
}

function LiveOfferCard({
  offer,
  featured,
}: {
  offer: InteractiveLearningOffer;
  featured?: boolean;
}) {
  const href = interactiveLearningPath(offer.experienceId);
  return (
    <article
      className={cn(
        marketingPanel,
        'group flex h-full flex-col overflow-hidden border-[#2490ed]/20 p-0 shadow-md transition hover:-translate-y-0.5 hover:shadow-xl',
        featured && 'lg:min-h-[320px]'
      )}
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-[#eef7ff] to-white px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
            Live
          </span>
          <span className="text-xs font-medium text-slate-500">{offer.disciplineLabel}</span>
        </div>
        <h3
          className={cn(
            'mt-3 font-semibold text-slate-950',
            featured ? 'text-xl md:text-2xl' : 'text-lg'
          )}
        >
          {offer.courseTitle}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{offer.teaser}</p>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-4 px-6 py-5">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Activities" value={String(offer.activityCount ?? '—')} />
          <Stat label="XP" value={offer.xpTotal != null ? String(offer.xpTotal) : '—'} />
          <Stat label="Time" value={offer.durationLabel ?? '—'} />
        </dl>
        <Link href={href} className={cn(marketingBtnPrimary, 'w-full justify-center')}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Start experience
        </Link>
      </div>
    </article>
  );
}

function UpcomingOfferCard({ offer }: { offer: InteractiveLearningOffer }) {
  return (
    <article className={cn(marketingPanel, 'flex h-full flex-col p-5 opacity-95')}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{offer.disciplineLabel}</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          <Lock className="h-3 w-3" aria-hidden />
          Coming soon
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-900">{offer.courseTitle}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{offer.teaser}</p>
      <Link
        href={`/courses/${offer.courseSlug}`}
        className="mt-4 text-sm font-semibold text-[#146fc2] hover:underline"
      >
        View course
      </Link>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <dt className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-slate-900">{value}</dd>
    </div>
  );
}
