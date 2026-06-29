'use client';

import Link from 'next/link';
import { Award, Building2 } from 'lucide-react';

import { formatOnboardingPrice, ONBOARDING_BRAND, type OnboardingPricingMeta } from '@/lib/onboarding/enterprise';

type Props = {
  company?: string | null;
  programName?: string | null;
  pricing?: OnboardingPricingMeta | null;
  progressPercent?: number | null;
  hubHref?: string;
};

export function OnboardingLearnHeader({
  company,
  programName,
  pricing,
  progressPercent,
  hubHref,
}: Props) {
  const priceLabel = formatOnboardingPrice(pricing ?? { amountAud: 1295, billingCycle: 'monthly', gst: 'exclusive', seats: 'unlimited' });

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[#2490ed]/20 bg-gradient-to-r from-[#eef7ff] via-white to-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2490ed] text-white shadow-sm">
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase">
              {ONBOARDING_BRAND}
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {company ?? 'CARSI Maintenance Company'}
            </p>
            {programName ? (
              <p className="mt-0.5 truncate text-xs text-slate-500">{programName}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
            {priceLabel}
          </span>
          {progressPercent != null ? (
            <span className="rounded-full bg-[#2490ed] px-3 py-1.5 font-semibold text-white">
              {progressPercent}% complete
            </span>
          ) : null}
          {hubHref ? (
            <Link
              href={hubHref}
              className="inline-flex items-center gap-1.5 font-medium text-[#146fc2] hover:underline"
            >
              <Award className="h-3.5 w-3.5" aria-hidden />
              Program hub
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
