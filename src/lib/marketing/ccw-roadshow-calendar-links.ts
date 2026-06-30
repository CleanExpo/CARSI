/**
 * Self-serve "Add to Calendar" link builders for the CCW Roadshow success page.
 *
 * These are a convenience for the registrant (Google Calendar template URL + a
 * downloadable .ics). The authoritative invite is still the server-side
 * Google-Calendar guest-add in ccw-roadshow-calendar.ts; this just lets people
 * who prefer to self-add (or who use a non-Google calendar) do so.
 *
 * Pure functions — no env, no secrets — safe to import from server or client.
 * A two-day workshop is represented as a single timed entry spanning day-one
 * start to day-two end; the description clarifies it runs each day.
 */

import type { CcwRoadshowEvent } from './ccw-roadshow';

/** Convert an ISO-8601 timestamp (with offset) to UTC calendar basic format: YYYYMMDDTHHMMSSZ. */
export function toCalendarUtcStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO timestamp for calendar link: ${iso}`);
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function eventLocation(event: CcwRoadshowEvent): string {
  return `${event.venueName}, ${event.streetAddress}, ${event.suburbStatePostcode}`;
}

function eventDetails(event: CcwRoadshowEvent): string {
  return `${event.description} Runs ${event.timeLabel} (${event.dateRangeLabel}). Free entry for past and current Carpet Cleaners Warehouse customers.`;
}

/** Build a Google Calendar "render template" URL that pre-fills a new event. */
export function buildGoogleCalendarLink(event: CcwRoadshowEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toCalendarUtcStamp(event.startDateIso)}/${toCalendarUtcStamp(event.endDateIso)}`,
    location: eventLocation(event),
    details: eventDetails(event),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Escape a value for an iCalendar TEXT field (RFC 5545 §3.3.11). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Build a standards-compliant .ics document for the event. */
export function buildIcsContent(event: CcwRoadshowEvent): string {
  const dtStart = toCalendarUtcStamp(event.startDateIso);
  const dtEnd = toCalendarUtcStamp(event.endDateIso);
  // Stable DTSTAMP (event start) keeps this function pure and deterministic.
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CARSI//CCW Business Growth Days//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:ccw-roadshow-${event.slug}@carsi.com.au`,
    `DTSTAMP:${dtStart}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(eventDetails(event))}`,
    `LOCATION:${escapeIcsText(eventLocation(event))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

/** Build a data: URI for a download-able .ics (works without client JS). */
export function buildIcsDataUri(event: CcwRoadshowEvent): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcsContent(event))}`;
}
