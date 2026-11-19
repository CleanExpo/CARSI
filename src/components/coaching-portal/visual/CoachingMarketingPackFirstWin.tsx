import Link from 'next/link';

import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
  coachingPrimaryBtn,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';

const STEPS = [
  'Confirm your business profile is complete',
  'Build your marketing pack (about 1–2 minutes)',
  'Review ranked fixes — Phill approves before they hit your action board',
  'Download checklist and social calendar drafts',
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
    <section className={`${coachingCard} mb-6 border-sky-500/20`} data-testid={testId}>
      <h2 className={coachingCardTitle}>Your first marketing pack</h2>
      <p className={`mt-2 ${coachingMuted}`}>
        Four steps — honest automation, coach-approved actions, claim-safe social drafts.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-300">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={coachingPortalPath('/onboarding/profile')} className={coachingSecondaryBtn}>
          Check profile
        </Link>
        <span className="inline-flex items-center text-xs text-slate-500">
          Then use Build my pack below
        </span>
      </div>
    </section>
  );
}