'use client';

import { ArrowRight, Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { OnboardingProgressRing } from '@/components/onboarding/OnboardingProgressRing';
import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';
import { formatOnboardingPrice, ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';

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
      <header className="space-y-3">
        <p className={dash.eyebrow}>{ONBOARDING_BRAND}</p>
        <h1 className={dash.h1}>Enterprise workforce onboarding</h1>
        <p className={`${dash.lead} max-w-3xl`}>
          Standardise operational readiness, safety, and professionalism across your maintenance
          teams. Built for facility management organisations — unlimited learners per subscription.
        </p>
      </header>
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
            Programs appear here once seeded and published for your organisation.
          </p>
        </div>
      ) : (
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
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  {p.title.replace(`${ONBOARDING_BRAND} — `, '')}
                </h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  {p.shortDescription ??
                    'Professional induction for technicians and supervisors across sensitive facilities.'}
                </p>
                <p className="text-xs text-slate-500">
                  {formatOnboardingPrice(p.meta?.pricing ?? null)}
                  {p.durationHours ? ` · ~${p.durationHours}h contact time` : ''}
                  {p.level ? ` · ${p.level}` : ''}
                </p>
                <Link href={`/dashboard/onboarding/${p.slug}`} className={dash.btnPrimary}>
                  {p.enrolled ? 'Open program hub' : 'View program'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {p.enrolled && p.progressPercent != null ? (
                <OnboardingProgressRing percent={p.progressPercent} size={100} />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
