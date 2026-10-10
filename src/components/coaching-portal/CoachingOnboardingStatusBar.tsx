'use client';

import Link from 'next/link';

import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import { coachingMuted } from '@/components/coaching-portal/coaching-ui';

const STEP_LABELS: Record<string, string> = {
  profile: 'Profile',
  assessment: 'Assessment',
  submit: 'Sent to Phill',
  session: 'Session booked',
};

export function CoachingOnboardingStatusBar() {
  const { onboarding, onboardingSubmit, access } = useCoachingPortal();

  if (access.mode === 'locked') return null;

  const allDone = onboarding.completedCount >= onboarding.steps.length;

  return (
    <section
      className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5"
      aria-label="Onboarding progress"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-sky-400/90 uppercase">
            Onboarding status
          </p>
          <p className={`mt-1 text-sm ${coachingMuted}`}>
            {allDone
              ? 'Setup complete — focus on your plan and monthly actions.'
              : `${onboarding.completedCount} of ${onboarding.steps.length} steps complete`}
          </p>
        </div>
        {onboardingSubmit.complete ? (
          <Link
            href="/coaching/onboarding/packet"
            className="text-xs font-semibold text-sky-300 hover:text-sky-200"
          >
            View what we sent Phill →
          </Link>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onboarding.steps.map((step) => {
          const label = STEP_LABELS[step.id] ?? step.title;
          return (
            <Link
              key={step.id}
              href={step.href}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                step.complete
                  ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25'
                  : 'bg-white/[0.04] text-slate-400 ring-1 ring-white/[0.08] hover:bg-white/[0.07] hover:text-slate-200'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${step.complete ? 'bg-emerald-400' : 'bg-slate-600'}`}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
