'use client';

import { Users } from 'lucide-react';
import Link from 'next/link';

import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';

/** GP-632 (A5): member-visible coach chapter — defaults to Phill until multi-coach data exists. */
export function CoachingCoachChapterCard({ className = '' }: { className?: string }) {
  const { coach, access } = useCoachingPortal();
  if (access.mode === 'locked') return null;

  return (
    <section className={`${coachingCard} ${className}`} data-testid="coaching-coach-chapter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" aria-hidden />
          <div>
            <p className={coachingEyebrow}>Your coaching chapter</p>
            <h2 className={`mt-1 ${coachingCardTitle}`}>{coach.displayName}</h2>
            <p className={`mt-1 ${coachingMuted}`}>{coach.headline}</p>
            <p className="mt-2 text-xs text-slate-500">
              Chapter:{' '}
              <span className="font-mono text-slate-400">{coach.chapterSlug}</span>
            </p>
          </div>
        </div>
        <Link
          href={coachingPortalPath('/sessions')}
          className={`inline-flex shrink-0 ${coachingSecondaryBtn}`}
        >
          Session hub
        </Link>
      </div>
    </section>
  );
}