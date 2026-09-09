/**
 * CARSI's own Australian courses, prepared for display on the Industry Calendar page.
 *
 * WHY THIS EXISTS. `/calendar` sources its events from the upstream events backend. When that
 * backend is unreachable the page's fetch swallows the error and returns an empty list, and the
 * page then renders placeholder cards. Measured against production on 2026-09-07: the live page
 * is 100 KB, contains **three placeholder cards** reading "Event slot 1 — calendar populating",
 * and **zero real events** — no month heading for any month of 2026 appears in the HTML. It is
 * an indexed, SEO-optimised page with nothing on it.
 *
 * This module gives the page real content from a source that works: CARSI's own catalogue,
 * read from CARSI's own database, independent of the upstream backend.
 *
 * NO DATES ARE INVENTED. CARSI courses are self-paced and the schema carries no start date,
 * session date or cohort field — verified against `prisma/schema.prisma`, which has no
 * `startDate`, `scheduledAt`, `sessionDate` or `cohort` on the course model. Presenting a
 * self-paced course under a fabricated date would be a false claim about availability, so these
 * are rendered as start-any-time entries alongside the dated industry events, never mixed into
 * them.
 *
 * BRAND EXCLUSION. Founder directive 2026-07-09 bars a named partner brand from the calendar.
 * That brand is deliberately NOT written here: `event-exclusions.ts` is the single chokepoint
 * that names and removes it, and the only path the terminology guard exempts. These are CARSI's
 * own courses, so the brand cannot appear by construction — but `isExcludedEvent` is applied
 * anyway, because "it cannot happen" is the reasoning that lets it happen. A course title is
 * attacker-adjacent content: it comes from the admin session, not from this repo.
 */
import { isExcludedEvent } from './event-exclusions';

/** The subset of a course this listing needs. Structurally satisfied by `CourseListItem`. */
export type CalendarCourse = {
  slug: string;
  title: string;
  short_description?: string | null;
  category?: string | null;
  is_free?: boolean;
  price_aud?: number | string;
  duration_hours?: string | null;
};

export type CalendarCourseEntry = {
  slug: string;
  title: string;
  href: string;
  summary: string | null;
  topic: string;
  /** Human-readable availability. Never a date — see the module note. */
  availability: string;
  isFree: boolean;
  /** Display-only AUD label. Never a date. */
  priceLabel: string | null;
};

/** Shown when a course carries no category. 29 of 80 live courses had none on 2026-09-07. */
export const UNCATEGORISED_TOPIC = 'General restoration';

function priceIsFree(course: CalendarCourse): boolean {
  if (course.is_free === true) return true;
  const n = typeof course.price_aud === 'string' ? Number(course.price_aud) : course.price_aud;
  return typeof n === 'number' && Number.isFinite(n) && n <= 0;
}

function formatAudPrice(price: CalendarCourse['price_aud']): string | null {
  const n = typeof price === 'string' ? Number(price) : price;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return null;
  return `$${Math.round(n)} AUD`;
}

/**
 * Turn published courses into calendar entries.
 *
 * Ordering is alphabetical by title so the list is stable between renders — the catalogue's own
 * `updatedAt` ordering would reshuffle the page whenever an admin saved any course.
 */
export function buildCalendarCourseEntries(courses: CalendarCourse[]): CalendarCourseEntry[] {
  const safe = courses.filter(
    (c) =>
      !isExcludedEvent({ title: c.title, organiser_name: null, event_url: `/courses/${c.slug}` })
  );

  return safe
    .filter((c) => c.slug && c.title)
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      href: `/courses/${c.slug}`,
      summary: c.short_description?.trim() || null,
      topic: c.category?.trim() || UNCATEGORISED_TOPIC,
      availability: 'Start any time — self-paced',
      isFree: priceIsFree(c),
      priceLabel: priceIsFree(c) ? null : formatAudPrice(c.price_aud),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'en-AU'));
}

/** Group entries by topic for display, topics in alphabetical order. */
export function groupCoursesByTopic(
  entries: CalendarCourseEntry[]
): Array<{ topic: string; courses: CalendarCourseEntry[] }> {
  const byTopic = new Map<string, CalendarCourseEntry[]>();
  for (const e of entries) {
    byTopic.set(e.topic, [...(byTopic.get(e.topic) ?? []), e]);
  }
  return [...byTopic.entries()]
    .map(([topic, courses]) => ({ topic, courses }))
    .sort((a, b) => a.topic.localeCompare(b.topic, 'en-AU'));
}
