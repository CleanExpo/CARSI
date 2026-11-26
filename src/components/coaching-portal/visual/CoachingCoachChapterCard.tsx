'use client';

import { Ticket, UserRound, Video } from 'lucide-react';
import Link from 'next/link';

import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingSecondaryBtn,
  coachingStatTile,
} from '@/components/coaching-portal/coaching-ui';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';

/** GP-632 (A5): member-visible coach chapter — defaults to Phill until multi-coach data exists. */
export function CoachingCoachChapterCard({ className = '' }: { className?: string }) {
  const { coach, access } = useCoachingPortal();
  if (access.mode === 'locked') return null;

  return (
    <section className={`${coachingCard} ${className}`} data-testid="coaching-coach-chapter">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className={coachingEyebrow}>Your coaching chapter</p>
          <h2 className={`mt-2 ${coachingCardTitle}`}>{coach.chapterTitle}</h2>
          <p className={`mt-2 ${coachingMuted}`}>{coach.headline}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={coachingStatTile}>
              <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Lead coach
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                <UserRound className="h-4 w-4 text-sky-400/80" aria-hidden />
                {coach.displayName}
              </p>
            </div>
            <div className={coachingStatTile}>
              <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Membership
              </p>
              <p className="mt-1 text-sm font-semibold text-white tabular-nums">
                {coach.priceLabel}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-500">{coach.chapterSlug}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Link
            href={coachingPortalPath('/sessions')}
            className={`inline-flex justify-center ${coachingSecondaryBtn}`}
          >
            <Video className="h-4 w-4 shrink-0" aria-hidden />
            Session hub
          </Link>
          <Link
            href={coachingPortalPath('/tradehall')}
            className={`inline-flex justify-center ${coachingSecondaryBtn}`}
          >
            <Ticket className="h-4 w-4 shrink-0" aria-hidden />
            Trade Hall
          </Link>
        </div>
      </div>
    </section>
  );
}
