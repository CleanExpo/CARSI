import { ArrowRight, ListChecks, Sparkles } from 'lucide-react';
import Link from 'next/link';

import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';

const STEPS = [
  {
    title: 'Profile ready',
    detail: 'Business name, trade, town and services drive your pack voice.',
  },
  {
    title: 'Build your pack',
    detail: 'One secure pass over your public site — about 1–2 minutes.',
  },
  {
    title: 'Coach approval',
    detail: 'Ranked fixes land on your board only after Phill approves them.',
  },
  {
    title: 'Use your drafts',
    detail: 'Download checklist and claim-safe social calendar templates.',
  },
] as const;

export function CoachingMarketingPackFirstWin({
  profileReady,
  hasPack,
  testId = 'coaching-marketing-first-win',
}: {
  profileReady: boolean;
  hasPack: boolean;
  testId?: string;
}) {
  if (hasPack || !profileReady) return null;

  return (
    <section
      className={`${coachingCard} mb-6 border-sky-400/25 bg-gradient-to-br from-sky-500/[0.08] via-transparent to-transparent ring-1 ring-sky-400/15`}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 ring-1 ring-sky-400/25"
            aria-hidden
          >
            <Sparkles className="h-5 w-5 text-sky-300" />
          </span>
          <div>
            <h2 className={coachingCardTitle}>Your first marketing pack</h2>
            <p className={`mt-1 max-w-xl ${coachingMuted}`}>
              Honest automation, coach-approved actions, and claim-safe social drafts — built for
              Australian trade businesses.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-sky-200 uppercase ring-1 ring-sky-400/25">
          <ListChecks className="h-3.5 w-3.5" aria-hidden />
          Four steps
        </span>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="First marketing pack steps">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/15 px-4 py-3"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-100 ring-1 ring-sky-400/30"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href={coachingPortalPath('/onboarding/profile')}
          className={`${coachingSecondaryBtn} inline-flex items-center gap-2`}
        >
          Review profile
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <p className="text-xs text-slate-500">
          Then scroll to <span className="font-medium text-slate-400">Build my marketing pack</span>{' '}
          on this page.
        </p>
      </div>
    </section>
  );
}
