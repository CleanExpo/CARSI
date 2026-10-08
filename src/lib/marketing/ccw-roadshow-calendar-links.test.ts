import { describe, expect, it } from 'vitest';

import { ccwRoadshowEvents, getCcwRoadshowEvent } from './ccw-roadshow';
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

describe('October occurrence calendar', () => {
  it('uses distinct identity, Brisbane offsets and paid booking copy', () => {
    const october = getCcwRoadshowEvent('brisbane-2026-10-09');
    expect(october).not.toBeNull();
    if (!october) return;
    const ics = buildIcsContent(october).replace(/\r\n /g, '');
    expect(ics).toContain('UID:ccw-roadshow-brisbane-2026-10-09@carsi.com.au');
    expect(ics).toContain('DTSTART:20261008T223000Z');
    expect(ics).toContain('DTEND:20261010T050000Z');
    expect(ics).not.toContain('Free entry');
    expect(ics).toContain('AUD495');
    expect(ics).toContain('One AUD200 CCW gift card per registration');
    expect(ics).toContain('redeemable after the course.');
    expect(ics).toContain('https://ccwonline.com.au/collections/training-marketing');
    expect(ics).not.toContain('carsi-2-day-carpet-upholstery-training-course');
    expect(ics).not.toContain('srsltid=');
    const google = new URL(buildGoogleCalendarLink(october));
    expect(google.searchParams.get('ctz')).toBe('Australia/Brisbane');
    expect(google.searchParams.get('details')).toContain('8.30am-3pm');
    expect(google.searchParams.get('details')).toContain(october.bookingUrl);
    expect(google.searchParams.get('details')).not.toContain('srsltid=');
    expect(google.searchParams.get('details')).toContain('One AUD200 CCW gift card per registration, redeemable after the course.');
  });

  it('does not call a historical paid September sitting free', () => {
    const september = getCcwRoadshowEvent('brisbane')!;
    expect(buildIcsContent(september)).toContain('UID:ccw-roadshow-brisbane@carsi.com.au');
    expect(buildIcsContent(september)).not.toContain('Free entry');
    expect(buildIcsContent(september)).not.toContain('AUD200');
  });

  it('folds long calendar lines at 75 UTF-8 octets without corrupting text', () => {
    const event = { ...melbourne, description: 'Training for T\u0101mati '.repeat(15) };
    const ics = buildIcsContent(event);
    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    expect(ics.replace(/\r\n /g, '')).toContain(event.description);
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
