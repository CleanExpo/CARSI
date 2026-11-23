/**
 * GP-636 (A9) — member TradeHall passport.
 */
import type { CoachingCoachProfile } from '@/lib/coaching-portal/coach-routing';

export type TradeHallPassport = {
  memberDisplayName: string;
  chapterSlug: string;
  coachName: string;
  /** ISO date when membership became active enough for hall access preview. */
  memberSinceIso: string;
  passportId: string;
  status: 'preview' | 'active';
};

export function buildTradeHallPassport(input: {
  memberDisplayName: string;
  coach: CoachingCoachProfile;
  subscriptionStartedAt: Date | null;
  now?: Date;
}): TradeHallPassport {
  const now = input.now ?? new Date();
  const since = input.subscriptionStartedAt ?? now;
  const slug = input.coach.chapterSlug;
  const short = slug
    .replace(/[^a-z0-9]+/gi, '-')
    .slice(0, 12)
    .toUpperCase();
  const passportId = `TH-${short}-${since.getUTCFullYear()}`;
  return {
    memberDisplayName: input.memberDisplayName,
    chapterSlug: slug,
    coachName: input.coach.displayName,
    memberSinceIso: since.toISOString(),
    passportId,
    status: 'preview',
  };
}
