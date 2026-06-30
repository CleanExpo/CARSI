'use client';

import { ArrowRight, Building2, Layers, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';

import { OnboardingProgressRing } from '@/components/onboarding/OnboardingProgressRing';
import { dash } from '@/lib/dashboard-light-ui';
import {
  FLOOR_CARE_PHASES,
  formatOnboardingPrice,
  ONBOARDING_BRAND,
} from '@/lib/onboarding/enterprise';
import { getOnboardingProgramPath } from '@/lib/onboarding/navigation';

export type OnboardingSpotlightProgram = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  level: string | null;
  durationHours: number | null;
  meta: { program?: string; pricing?: { amountAud?: number } } | null;
  enrolled: boolean;
  progressPercent: number | null;
};

type Props = {
  programs: OnboardingSpotlightProgram[];
  variant?: 'featured' | 'compact';
};

export function OnboardingSpotlight({ programs, variant = 'featured' }: Props) {
  if (programs.length === 0) return null;

  const primary = programs[0];
  const programTitle = primary.title.replace(`${ONBOARDING_BRAND} — `, '');
  const hubHref = getOnboardingProgramPath(primary.slug);
  const priceLabel = formatOnboardingPrice(primary.meta?.pricing ?? null);

  if (variant === 'compact') {
    return (
      <section
        aria-labelledby="onboarding-spotlight-heading"
        className={`${dash.hero} relative overflow-hidden p-6 sm:p-8`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(36,144,237,0.14),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <p className={dash.eyebrow}>{ONBOARDING_BRAND}</p>
            <h2 id="onboarding-spotlight-heading" className="text-xl font-semibold text-slate-900 sm:text-2xl">
              {programTitle}
            </h2>
            <p className={`max-w-2xl text-sm ${dash.muted}`}>
              {primary.shortDescription ??
                'Enterprise floor-care induction — safety, hygiene, and operational readiness for sensitive facilities.'}
            </p>
            <p className="text-xs text-slate-500">
              {priceLabel}
              {primary.durationHours ? ` · ~${primary.durationHours}h` : ''}
              {primary.level ? ` · ${primary.level}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {primary.enrolled && primary.progressPercent != null ? (
              <OnboardingProgressRing percent={primary.progressPercent} size={72} />
            ) : null}
            <Link href={hubHref} className={dash.btnPrimary}>
              {primary.enrolled ? 'Open program hub' : 'Explore program'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/dashboard/onboarding" className={dash.btnSecondary}>
              All programs
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="onboarding-spotlight-heading" className="space-y-6">
      <div className={`${dash.hero} relative overflow-hidden`}>
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_100%_0%,rgba(36,144,237,0.12),transparent_50%),radial-gradient(ellipse_50%_40%_at_0%_100%,rgba(237,157,36,0.08),transparent_45%)]"
          aria-hidden
        />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
          <div className="space-y-5">
            <p className={dash.eyebrow}>{ONBOARDING_BRAND}</p>
            <h2 id="onboarding-spotlight-heading" className={`text-balance ${dash.h1}`}>
              Train your maintenance teams to a single operational standard
            </h2>
            <p className={`max-w-xl ${dash.lead}`}>
              {primary.shortDescription ??
                'Structured induction for technicians and supervisors — from site safety and hygiene through to evidence-based handover.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={hubHref} className={dash.btnPrimary}>
                {primary.enrolled ? 'Continue program' : 'View program'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/dashboard/onboarding" className={dash.btnSecondary}>
                Onboarding hub
              </Link>
            </div>
            <p className="text-xs text-slate-500">
              {priceLabel} · {FLOOR_CARE_PHASES.length} phases · unlimited learners per organisation
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Building2, label: 'Facility-ready', body: 'Schools, childcare, education and commercial sites.' },
              { icon: Users, label: 'Whole team', body: 'Supervisors and technicians on one subscription.' },
              { icon: ShieldCheck, label: 'Safety-first', body: 'WHS, chemicals, machinery and site control.' },
              { icon: Layers, label: '12 modules', body: 'Knowledge checks and practical competency gates.' },
            ].map((item) => (
              <div key={item.label} className={`${dash.cardInset} flex gap-3 p-4`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef7ff] text-[#146fc2]">
                  <item.icon className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {programs.length > 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {programs.slice(1).map((p) => (
            <article key={p.id} className={`${dash.card} p-5`}>
              <p className="text-xs font-semibold tracking-wide text-[#146fc2] uppercase">
                {p.meta?.program ?? 'Onboarding program'}
              </p>
              <h3 className="mt-2 font-semibold text-slate-900">
                {p.title.replace(`${ONBOARDING_BRAND} — `, '')}
              </h3>
              <Link href={getOnboardingProgramPath(p.slug)} className={`mt-4 ${dash.btnSecondary}`}>
                View program
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
