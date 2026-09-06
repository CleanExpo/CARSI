/**
 * Industry-calendar exclusion guard.
 *
 * Hard rule (founder directive 2026-07-09): COACH8 must NEVER appear anywhere in the events,
 * the calendar, or as evidence. This is the single chokepoint that enforces it regardless of
 * what the backend returns — every event list rendered on the calendar passes through
 * `filterExcludedEvents` first.
 */

/**
 * Names/brands that must never surface on the calendar. Lower-case, matched as substrings.
 *
 * Exported so other calendar modules and their tests can assert against the exclusion rule
 * WITHOUT repeating the brand literal. This file and its test are the only two paths the
 * terminology guard exempts (`scripts/check-iicrc-terminology.mjs`), so a literal written
 * anywhere else in the tree is a guard failure — correctly, since the rule is that the brand
 * appears nowhere except the chokepoint that removes it.
 */
export const EXCLUDED_TERMS = ['coach8', 'coach 8'];

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
