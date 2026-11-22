'use client';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { InteractiveExperiencePlayer } from '@/components/lms/interactive/InteractiveExperiencePlayer';
import type { InteractiveExperience } from '@/lib/lms/interactive-experience-types';
import type { InteractiveLearningOffer } from '@/lib/lms/interactive-learning-catalog';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingPanel,
} from '@/lib/marketing/marketing-ui';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brain,
  Compass,
  Map,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

const PILLARS = [
  {
    icon: ShieldAlert,
    title: 'Field scenarios',
    body: 'Australian jobs, metric context, and safety-first sequencing — not theory-only pages.',
  },
  {
    icon: Map,
    title: 'Visual investigation',
    body: 'Course diagrams and site cues you explore by tapping — discovery, not decoration.',
  },
  {
    icon: Brain,
    title: 'Professional judgement',
    body: 'Branching decisions with practitioner feedback when the call is wrong.',
  },
  {
    icon: BookOpen,
    title: 'Course-connected',
    body: 'Aligned to lesson outcomes in the full CARSI course — simulations are education only.',
  },
] as const;

interface InteractiveLearningExperienceViewProps {
  offer: InteractiveLearningOffer;
  experience: InteractiveExperience;
}

export function InteractiveLearningExperienceView({
  offer,
  experience,
}: InteractiveLearningExperienceViewProps) {
  const courseHref = `/courses/${offer.courseSlug}`;
  const learnHref = `/dashboard/learn/${offer.courseSlug}`;
  const heroTitle = offer.heroTitle ?? experience.title;

  return (
    <div className="w-full">
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-[#f0f7ff] to-[#fafbfc]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(36,144,237,0.12), transparent 42%), radial-gradient(circle at 80% 0%, rgba(20,111,194,0.08), transparent 40%)',
          }}
        />
        <div className={cn(PUBLIC_SHELL_INNER_CLASS, 'relative py-12 md:py-16 lg:py-20')}>
          <Link
            href="/interactive-learning"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#146fc2] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All interactive experiences
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className={LANDING_EYEBROW_CLASS}>{offer.disciplineLabel}</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
              Live experience
            </span>
            <span className="text-xs text-slate-500">{offer.courseTitle}</span>
          </div>
          <h1
            className={cn(
              LANDING_DISPLAY_H2_CLASS,
              'mt-4 max-w-4xl text-[2.1rem] md:text-[2.85rem]'
            )}
          >
            {heroTitle}
          </h1>
          <p className={cn(LANDING_LEAD_CLASS, 'mt-4 max-w-2xl')}>
            {offer.lessonAnchor ? (
              <>
                Mirrors enrolled lesson{' '}
                <strong className="font-semibold text-slate-800">{offer.lessonAnchor}</strong>.{' '}
              </>
            ) : null}
            {experience.subtitle ?? offer.teaser} Progress saves in this browser on the public demo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#interactive-demo" className={marketingBtnPrimary}>
              Start practice
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <Link href={courseHref} className={marketingBtnSecondary}>
              Course overview
            </Link>
          </div>
          <dl className="mt-10 grid gap-4 sm:grid-cols-3 lg:max-w-2xl">
            {[
              { dt: 'Activities', dd: String(offer.activityCount ?? experience.activities.length) },
              { dt: 'Time', dd: offer.durationLabel ?? '12–20 min' },
              { dt: 'XP', dd: String(offer.xpTotal ?? '—') },
            ].map((item) => (
              <div key={item.dt} className={cn(marketingPanel, 'px-4 py-3')}>
                <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  {item.dt}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{item.dd}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="interactive-demo" className="scroll-mt-24 py-10 md:py-14 lg:py-16">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="grid gap-10 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] xl:items-start">
            <aside className="space-y-6 xl:sticky xl:top-28">
              <div className="flex items-start gap-3">
                <Compass className="mt-1 h-6 w-6 shrink-0 text-[#146fc2]" aria-hidden />
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Course practice advisor</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    This experience is one layer in the {offer.courseTitle} pathway. Work through
                    activities in order — mastery unlocks the next step.
                  </p>
                </div>
              </div>
              <ul className="space-y-3">
                {PILLARS.map(({ icon: Icon, title, body }) => (
                  <li
                    key={title}
                    className={cn(
                      marketingPanel,
                      'flex gap-3 p-4 transition hover:border-[#2490ed]/30'
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2490ed]/20 bg-[#eef7ff] text-[#146fc2]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {experience.disclaimer}
              </p>
            </aside>
            <div className="min-w-0">
              <InteractiveExperiencePlayer
                experience={experience}
                progressKey={`public-${offer.experienceId}`}
                label="Live practice"
                layout="immersive"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-white py-12 md:py-14">
        <div
          className={cn(
            PUBLIC_SHELL_INNER_CLASS,
            'flex flex-col gap-6 md:flex-row md:items-center md:justify-between'
          )}
        >
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-slate-950">Continue in the full course</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Enrol for modules, checks, credentials, and the complete{' '}
              {offer.disciplineLabel.toLowerCase()} training record.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={courseHref} className={marketingBtnPrimary}>
              View course
            </Link>
            <Link href={learnHref} className={marketingBtnSecondary}>
              Learner shell
            </Link>
            <Link
              href="/interactive-learning"
              className="text-sm font-semibold text-[#146fc2] underline-offset-2 hover:underline"
            >
              Other disciplines
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
