/**
 * Homepage roadshow stops: the single source the homepage reads for upcoming in-person dates.
 *
 * Dates are calendar days in Australia/Brisbane (the events run on AEST). A stop is upcoming
 * until the end of its last day; the homepage renders only upcoming stops, so a past date
 * cannot appear on it again without a code change (WS1 fix 6, GP-545).
 *
 * The roadshow page and its booking data live in `ccw-roadshow.ts` and are deliberately not
 * read here: their dates, offers and payment flags are founder decisions (DECISIONS 18 to 20).
 */
export type RoadshowStop = {
  city: string;
  /** First event day, YYYY-MM-DD, Australia/Brisbane. */
  startsOn: string;
  /** Last event day, YYYY-MM-DD, Australia/Brisbane. */
  endsOn: string;
};

/** Brisbane, Friday 4 to Saturday 5 September 2026 (founder decision of 26/08/2026, DECISIONS.md). */
export const ROADSHOW_STOPS: readonly RoadshowStop[] = [
  { city: 'Brisbane', startsOn: '2026-09-04', endsOn: '2026-09-05' },
];

/** What the ticket says when no stop is upcoming: a fact about the page, not a promise. */
export const NO_UPCOMING_STOPS_COPY = 'No upcoming dates listed';

const BRISBANE_DAY = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Brisbane',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Australia/Brisbane is AEST all year (UTC+10, no daylight saving). */
const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;

/**
 * Today's calendar day in Australia/Brisbane as YYYY-MM-DD, assembled from the formatter's
 * parts so the result never depends on a locale's output order.
 */
export function todayInBrisbane(now: Date = new Date()): string {
  const parts = BRISBANE_DAY.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Milliseconds from `now` until the next midnight in Brisbane (at least one second). */
export function msUntilNextBrisbaneMidnight(now: Date = new Date()): number {
  const wallClock = new Date(now.getTime() + BRISBANE_OFFSET_MS);
  const nextMidnight =
    Date.UTC(wallClock.getUTCFullYear(), wallClock.getUTCMonth(), wallClock.getUTCDate() + 1) -
    BRISBANE_OFFSET_MS;
  return Math.max(1000, nextMidnight - now.getTime());
}

/** The stops in `stops` whose last day is `today` or later, in the given order. */
export function upcomingStops(stops: readonly RoadshowStop[], today: string): RoadshowStop[] {
  return stops.filter((stop) => stop.endsOn >= today);
}

/** The configured stops whose last day is today or later, in circuit order. */
export function upcomingRoadshowStops(today: string = todayInBrisbane()): RoadshowStop[] {
  return upcomingStops(ROADSHOW_STOPS, today);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayAndMonth(isoDay: string): { day: number; month: string } {
  const [, month, day] = isoDay.split('-').map(Number);
  return { day, month: MONTHS[month - 1] };
}

/**
 * The ticket's date label, derived from the ISO days so it cannot drift from them: a range
 * within one month names the month once, a range across months names both, a single day
 * names just that day.
 */
export function formatStopDates(stop: Pick<RoadshowStop, 'startsOn' | 'endsOn'>): string {
  const start = dayAndMonth(stop.startsOn);
  const end = dayAndMonth(stop.endsOn);
  if (stop.startsOn === stop.endsOn) return `${start.day} ${start.month}`;
  if (start.month === end.month) return `${start.day} to ${end.day} ${end.month}`;
  return `${start.day} ${start.month} to ${end.day} ${end.month}`;
}
