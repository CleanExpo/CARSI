'use client';

import { ArrowRight, Building2, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';

import { dash } from '@/lib/dashboard-light-ui';
import { formatOnboardingPrice, ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';
import { cn } from '@/lib/utils';

type Props = {
  programTitle: string;
  programSlug: string;
  valueProposition: string;
  enrolled: boolean;
  progressPercent?: number | null;
  pricingNote?: string;
  ctaLabel: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  ctaLoading?: boolean;
};

export function OnboardingProgramHero({
  programTitle,
  programSlug,
  valueProposition,
  enrolled,
  progressPercent,
  pricingNote,
  ctaHref,
  ctaLabel,
  onCtaClick,
  ctaLoading = false,
}: Props) {
  const price = pricingNote ?? formatOnboardingPrice({ amountAud: 1295, billingCycle: 'monthly', gst: 'exclusive', seats: 'unlimited' });

  return (
    <section className={`${dash.hero} relative overflow-hidden`}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(36,144,237,0.12),transparent_55%),radial-gradient(ellipse_60%_50%_at_0%_100%,rgba(237,157,36,0.08),transparent_50%)]"
        aria-hidden
      />
      <div className="relative grid gap-10 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
        <div className="space-y-6">
          <p className={dash.eyebrow}>{ONBOARDING_BRAND}</p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
            {programTitle.replace(`${ONBOARDING_BRAND} — `, '')}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600">{valueProposition}</p>
          <div className="flex flex-wrap gap-3">
            {onCtaClick ? (
              <button
                type="button"
                onClick={onCtaClick}
                disabled={ctaLoading}
                className={cn(dash.btnPrimary, ctaLoading && 'pointer-events-none opacity-70')}
              >
                {ctaLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Enrolling…
                  </>
                ) : (
                  <>
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            ) : ctaHref ? (
              <Link href={ctaHref} className={dash.btnPrimary}>
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
            <Link href={`/dashboard/onboarding/${programSlug}/supervisor`} className={dash.btnSecondary}>
              Supervisor view
            </Link>
          </div>
          {enrolled && progressPercent != null ? (
            <p className="text-sm font-medium text-[#146fc2]">
              Your progress: {progressPercent}% complete
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {[
            { icon: Building2, title: 'Enterprise ready', body: 'Built for facility management groups and multi-site operators.' },
            { icon: Users, title: 'Unlimited learners', body: 'One organisation subscription — train every technician and supervisor.' },
            { icon: ShieldCheck, title: 'Operational standards', body: 'Safety, hygiene, professionalism and evidence on every job.' },
            { icon: Sparkles, title: 'Career pathway', body: 'Structured 30/60/90 progression from induction to independent operator.' },
          ].map((item) => (
            <div key={item.title} className={`${dash.cardInset} flex gap-3 p-4`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef7ff] text-[#146fc2]">
                <item.icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.body}</p>
              </div>
            </div>
          ))}
          <div className={`${dash.cardInset} border-[#2490ed]/20 bg-[#eef7ff]/60 p-4 sm:col-span-2 lg:col-span-1`}>
            <p className="text-[10px] font-semibold tracking-wider text-[#146fc2] uppercase">
              Organisation pricing
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{price}</p>
            <p className="mt-1 text-xs text-slate-500">Provisioned per client organisation — not individual retail checkout.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
