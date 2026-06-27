'use client';

import { ArrowRight, Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { OnboardingProgressRing } from '@/components/onboarding/OnboardingProgressRing';
import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';
import {
  FLOOR_CARE_PHASES,
  formatOnboardingPrice,
  ONBOARDING_BRAND,
} from '@/lib/onboarding/enterprise';

type Program = {
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

export function OnboardingHubClient() {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ programs: Program[] }>('/api/lms/onboarding/programs')
      .then((data) => setPrograms(data.programs))
      .catch(() => setError('Could not load onboarding programs.'));
  }, []);

  if (programs === null && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading programs…
      </div>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 space-y-10 pb-16">
      <header className={`${dash.hero} relative overflow-hidden p-6 sm:p-10`}>
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_100%_0%,rgba(36,144,237,0.12),transparent_50%)]"
          aria-hidden
        />
        <div className="relative max-w-3xl space-y-4">
          <p className={dash.eyebrow}>{ONBOARDING_BRAND}</p>
          <h1 className={dash.h1}>Enterprise workforce onboarding</h1>
          <p className={dash.lead}>
            Standardise operational readiness, safety, and professionalism across your maintenance
            teams. Organisation subscriptions include unlimited learners — built for facility
            management groups operating across schools, childcare, education and commercial sites.
          </p>
        </div>
      </header>

      <section aria-labelledby="onboarding-phases-heading" className="space-y-4">
        <h2 id="onboarding-phases-heading" className="text-lg font-semibold text-slate-900">
          How programs are structured
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {FLOOR_CARE_PHASES.map((phase, index) => (
            <div key={phase.id} className={`${dash.cardInset} p-4`}>
              <p className="text-[10px] font-semibold tracking-wider text-[#146fc2] uppercase">
                Phase {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{phase.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{phase.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {programs?.length === 0 ? (
        <div className={`${dash.panel} w-full p-10 text-center`}>
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-medium text-slate-800">
            No onboarding programs in the catalogue yet
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Programs appear here once seeded for your organisation. Contact your CARSI account
            manager if you expect access.
          </p>
        </div>
      ) : (
        <section aria-labelledby="onboarding-programs-heading" className="space-y-4">
          <h2 id="onboarding-programs-heading" className="text-lg font-semibold text-slate-900">
            Available programs
          </h2>
          <div className="grid w-full gap-6">
            {programs?.map((p) => (
              <article
                key={p.id}
                className={`${dash.hero} grid w-full gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8`}
              >
                <div className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-[#146fc2] uppercase">
                    {p.meta?.program ?? 'Onboarding program'}
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                    {p.title.replace(`${ONBOARDING_BRAND} — `, '')}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {p.shortDescription ??
                      'Professional induction for technicians and supervisors across sensitive facilities.'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatOnboardingPrice(p.meta?.pricing ?? null)}
                    {p.durationHours ? ` · ~${p.durationHours}h contact time` : ''}
                    {p.level ? ` · ${p.level}` : ''}
                    {` · ${FLOOR_CARE_PHASES.length} phases`}
                  </p>
                  <Link href={`/dashboard/onboarding/${p.slug}`} className={dash.btnPrimary}>
                    {p.enrolled ? 'Open program hub' : 'View program & subscribe'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                {p.enrolled && p.progressPercent != null ? (
                  <OnboardingProgressRing percent={p.progressPercent} size={100} />
                ) : (
                  <div
                    className={`${dash.cardInset} hidden max-w-[200px] p-4 text-center sm:block`}
                    aria-hidden
                  >
                    <p className="text-2xl font-bold text-[#146fc2]">12</p>
                    <p className="text-xs text-slate-500">modules · knowledge checks</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
