import type { Metadata } from 'next';
import Link from 'next/link';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';
import {
  PARTNER_DEMO_COACH,
  PARTNER_DEMO_MEMBER,
  PARTNER_DEMO_ONBOARDING_SNAPSHOT,
  PARTNER_DEMO_WALKTHROUGH_STEPS,
  PARTNER_DEMO_WORKSPACE,
} from '@/lib/coaching-portal/partner-demo';
import { carsiCoachingMonthlyPath } from '@/lib/marketing/carsi-coaching-monthly';

export const metadata: Metadata = {
  title: 'Business Coaching partner demo',
  description:
    'Ten-minute walkthrough of the CARSI Business Coaching workspace — sample member, plan, and actions (demo data only).',
  robots: { index: false, follow: false },
};

export default function CoachingPartnerDemoPage() {
  const snapshot = PARTNER_DEMO_ONBOARDING_SNAPSHOT;

  return (
    <>
      <PlatformNav current="/ccw-training/partner-demo" />
      <main id="main-content" className="bg-[#0b1220] pt-10 pb-20 text-slate-100">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className="text-xs font-semibold tracking-[0.2em] text-sky-400/90 uppercase">
            Partner demo · GP-637
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Business Coaching in ten minutes
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
            Sample data only — use this script when showing a prospect coach the member journey.
            Live workspace: subscribe at{' '}
            <Link
              href={carsiCoachingMonthlyPath}
              className="text-sky-300 underline-offset-2 hover:underline"
            >
              {carsiCoachingMonthlyPath}
            </Link>
            , then sign in as a member.
          </p>

          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h2 className="text-lg font-semibold text-white">Sample member</h2>
            <p className="mt-2 text-sm text-slate-400">
              {PARTNER_DEMO_MEMBER.fullName} · {snapshot.profile.businessName} · coached by{' '}
              {PARTNER_DEMO_COACH.displayName}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs tracking-wide text-slate-500 uppercase">Plan focus</dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {PARTNER_DEMO_WORKSPACE.horizontalSummary}
                </dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-slate-500 uppercase">Direction</dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {PARTNER_DEMO_WORKSPACE.directionSummary}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-white">Walkthrough steps</h2>
            <ol className="mt-4 space-y-3">
              {PARTNER_DEMO_WALKTHROUGH_STEPS.map((step, index) => (
                <li
                  key={step.segment}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <span className="text-sm text-slate-200">
                    <span className="mr-2 font-mono text-sky-400/90">{index + 1}.</span>
                    {step.title}
                    <span className="ml-2 text-xs text-slate-500">~{step.minutes} min</span>
                  </span>
                  <Link
                    href={coachingPortalPath(step.segment)}
                    className="text-sm font-medium text-sky-300 underline-offset-2 hover:underline"
                  >
                    Open in portal
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="text-sm font-semibold text-amber-100">Onboarding brief (excerpt)</h2>
            <p className="mt-2 text-sm text-amber-50/90">{snapshot.statements.problemStatement}</p>
            <p className="mt-2 text-sm text-amber-50/80">
              Goal: {snapshot.statements.goalStatement}
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
