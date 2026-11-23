/**
 * GP-632 (Coaching advantage A5) — multi-coach chapters and routing.
 */
import {
  DEFAULT_COACHING_CHAPTER_SLUG,
  formatChapterPriceLabel,
  getCoachingChapter,
  getCoachingChapterByCoachId,
  type CoachingChapterCurrency,
} from '@/lib/coaching-portal/coaching-chapters';

export type CoachingChapterSlug = string;

export type CoachingCoachProfile = {
  id: string;
  displayName: string;
  chapterSlug: CoachingChapterSlug;
  chapterTitle: string;
  currency: CoachingChapterCurrency;
  priceLabel: string;
  /** Public-facing specialty line for chapter branding (AU English). */
  headline: string;
  bookingUrl?: string;
  isDemoChapter?: boolean;
};

export type CoachingMemberCoachAssignment = {
  memberUserId: string;
  coachUserId: string;
  chapterSlug: CoachingChapterSlug;
  assignedAtIso: string;
};

export { DEFAULT_COACHING_CHAPTER_SLUG };

const _defaultChapter = getCoachingChapter(DEFAULT_COACHING_CHAPTER_SLUG)!;

export const DEFAULT_COACHING_COACH: CoachingCoachProfile = {
  id: _defaultChapter.coachUserId,
  displayName: _defaultChapter.coachDisplayName,
  chapterSlug: _defaultChapter.slug,
  chapterTitle: _defaultChapter.title,
  currency: _defaultChapter.currency,
  priceLabel: formatChapterPriceLabel(_defaultChapter),
  headline: _defaultChapter.headline,
};

/**
 * Resolves the coach chapter shown in the member workspace until per-member assignments
 * (coachUserId / chapterSlug on profiles) ship in a follow-up migration (GP-632).
 */
export function resolveCoachingMemberCoach(input?: {
  sessionCoachName?: string | null;
  chapterSlug?: string | null;
  coachUserId?: string | null;
}): CoachingCoachProfile {
  let chapter =
    getCoachingChapter(input?.chapterSlug) ??
    getCoachingChapterByCoachId(input?.coachUserId) ??
    getCoachingChapter(DEFAULT_COACHING_CHAPTER_SLUG)!;

  if (input?.coachUserId?.trim()) {
    const byCoach = getCoachingChapterByCoachId(input.coachUserId);
    if (byCoach) chapter = byCoach;
  }

  const name = input?.sessionCoachName?.trim();
  const coachId = input?.coachUserId?.trim() || chapter.coachUserId;

  return {
    id: coachId,
    displayName: name && name !== chapter.coachDisplayName ? name : chapter.coachDisplayName,
    chapterSlug: chapter.slug,
    chapterTitle: chapter.title,
    currency: chapter.currency,
    priceLabel: formatChapterPriceLabel(chapter),
    headline: chapter.headline,
    isDemoChapter: chapter.isDemo,
  };
}
