/**
 * Industry-calendar exclusion guard.
 *
 * Hard rule (founder directive 2026-07-09): COACH8 must NEVER appear anywhere in the events,
 * the calendar, or as evidence. This is the single chokepoint that enforces it regardless of
 * what the backend returns — every event list rendered on the calendar passes through
 * `filterExcludedEvents` first.
 */

/** Names/brands that must never surface on the calendar. Lower-case, matched as substrings. */
const EXCLUDED_TERMS = ['coach8', 'coach 8'];

type ExcludableEvent = {
  title?: string | null;
  organiser_name?: string | null;
  event_url?: string | null;
};

/** True if the event references an excluded brand in its title, organiser, or URL. */
export function isExcludedEvent(event: ExcludableEvent): boolean {
  const haystack = `${event.title ?? ''} ${event.organiser_name ?? ''} ${event.event_url ?? ''}`.toLowerCase();
  return EXCLUDED_TERMS.some((term) => haystack.includes(term));
}

/** Remove every excluded event from a list. */
export function filterExcludedEvents<T extends ExcludableEvent>(events: T[]): T[] {
  return events.filter((e) => !isExcludedEvent(e));
}
