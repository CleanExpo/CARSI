/**
 * GP-636 (A9) — in-portal TradeHall seminars (YouTube privacy-enhanced embeds).
 */
export type TradeHallSeminar = {
  id: string;
  title: string;
  description: string;
  youtubeWatchUrl: string;
  durationLabel: string;
  chapterSlugs?: string[];
};

/** Override via rebuild with updated catalog, or fork chapter-specific seminars later. */
export const DEFAULT_TRADEHALL_SEMINAR_YOUTUBE = 'https://www.youtube.com/watch?v=39o0uYPo4jU';

/** Featured replay for all chapters until chapter-specific libraries land. */
export const TRADEHALL_FEATURED_SEMINARS: TradeHallSeminar[] = [
  {
    id: 'ai-embrace-restoration',
    title: 'Embrace AI in your restoration business',
    description:
      'Chapter replay: why AI changes marketing and operations, and how to adopt tools without losing owner judgement.',
    youtubeWatchUrl: DEFAULT_TRADEHALL_SEMINAR_YOUTUBE,
    durationLabel: '~45 min',
  },
  {
    id: 'quote-to-booking-rhythm',
    title: 'Quote-to-booking rhythm for owner-operators',
    description:
      'Workshop-style briefing: follow-up habits, protected quoting time, and measuring conversion without buying more gear.',
    youtubeWatchUrl: 'https://www.youtube.com/watch?v=ivoWtiCSDx8',
    durationLabel: '~12 min',
  },
];

export function tradeHallSeminarsForChapter(chapterSlug: string): TradeHallSeminar[] {
  return TRADEHALL_FEATURED_SEMINARS.filter(
    (s) => !s.chapterSlugs?.length || s.chapterSlugs.includes(chapterSlug)
  );
}
