import { describe, expect, it } from 'vitest';

import { ccwRoadshowEvents } from './ccw-roadshow';
import {
  buildGoogleCalendarLink,
  buildIcsContent,
  buildIcsDataUri,
  toCalendarUtcStamp,
} from './ccw-roadshow-calendar-links';

const melbourne = ccwRoadshowEvents.find((e) => e.slug === 'melbourne')!;

describe('toCalendarUtcStamp', () => {
  it('converts an offset ISO timestamp to UTC basic format', () => {
    // 08:30 +10:00 == 22:30Z the previous day
    expect(toCalendarUtcStamp('2026-07-22T08:30:00+10:00')).toBe('20260721T223000Z');
  });

  it('throws on an invalid timestamp', () => {
    expect(() => toCalendarUtcStamp('not-a-date')).toThrow();
  });
});

describe('buildGoogleCalendarLink', () => {
  const url = buildGoogleCalendarLink(melbourne);
  const parsed = new URL(url);

  it('targets the Google Calendar render template', () => {
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
  });

  it('includes the title, date range and location', () => {
    expect(parsed.searchParams.get('text')).toBe(melbourne.title);
    expect(parsed.searchParams.get('dates')).toBe('20260721T223000Z/20260723T063000Z');
    expect(parsed.searchParams.get('location')).toContain(melbourne.venueName);
  });
});

describe('buildIcsContent', () => {
  const ics = buildIcsContent(melbourne);

  it('is a well-formed VEVENT with start/end/summary', () => {
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20260721T223000Z');
    expect(ics).toContain('DTEND:20260723T063000Z');
    expect(ics).toContain(`SUMMARY:${melbourne.title.replace(/,/g, '\\,')}`);
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain(`UID:ccw-roadshow-${melbourne.slug}@carsi.com.au`);
  });

  it('uses CRLF line endings', () => {
    expect(ics.includes('\r\n')).toBe(true);
  });
});

describe('buildIcsDataUri', () => {
  it('produces a downloadable text/calendar data URI', () => {
    const uri = buildIcsDataUri(melbourne);
    expect(uri.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(uri.split(',').slice(1).join(','))).toContain('BEGIN:VEVENT');
  });
});
