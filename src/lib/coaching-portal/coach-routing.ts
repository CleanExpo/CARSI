/**
 * GP-632 (Coaching advantage A5) — multi-coach chapters and routing.
 * Schema + UI land in follow-up PRs; this module is the shared vocabulary.
 */
export type CoachingChapterSlug = string;

export type CoachingCoachProfile = {
  id: string;
  displayName: string;
  chapterSlug: CoachingChapterSlug;
  /** Public-facing specialty line for chapter branding (AU English). */
  headline: string;
  bookingUrl?: string;
};

export type CoachingMemberCoachAssignment = {
  memberUserId: string;
  coachUserId: string;
  chapterSlug: CoachingChapterSlug;
  assignedAtIso: string;
};

/** Default chapter until multi-coach data exists — Phill-led CARSI Business Coaching. */
export const DEFAULT_COACHING_CHAPTER_SLUG = 'carsi-business-coaching';

export const DEFAULT_COACHING_COACH: CoachingCoachProfile = {
  id: 'coach-phill-mcgurk',
  displayName: 'Phill McGurk',
  chapterSlug: DEFAULT_COACHING_CHAPTER_SLUG,
  headline: 'Business growth coaching for Australian cleaning and restoration owners',
};
