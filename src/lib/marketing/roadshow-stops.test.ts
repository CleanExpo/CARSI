import { describe, expect, it } from 'vitest';

import { homePathwayItems } from './home-pathways';
import {
  formatStopDates,
  NO_UPCOMING_STOPS_COPY,
  ROADSHOW_STOPS,
  todayInBrisbane,
  upcomingRoadshowStops,
} from './roadshow-stops';

/** A hard-coded day-to-day date, the shape that went stale on the homepage (WS1 break 8). */
const DAY_RANGE = /\b\d{1,2} to \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

describe('upcomingRoadshowStops', () => {
  it('lists Brisbane with its derived dates on the day before the event', () => {
    const stops = upcomingRoadshowStops('2026-09-03');
    expect(stops.map((stop) => stop.city)).toEqual(['Brisbane']);
    expect(formatStopDates(stops[0])).toBe('4 to 5 Sep');
  });

  it('still lists the stop on its last day', () => {
    expect(upcomingRoadshowStops('2026-09-05').map((stop) => stop.city)).toEqual(['Brisbane']);
  });

  it('lists nothing the day after the event ends', () => {
    expect(upcomingRoadshowStops('2026-09-06')).toEqual([]);
  });

  it('defaults to today in Brisbane, so no listed stop has already ended', () => {
    const today = todayInBrisbane();
    for (const stop of upcomingRoadshowStops()) {
      expect(stop.endsOn >= today).toBe(true);
    }
  });

  it('every configured stop is an ISO day range that ends on or after it starts', () => {
    expect(ROADSHOW_STOPS.length).toBeGreaterThan(0);
    for (const stop of ROADSHOW_STOPS) {
      expect(stop.startsOn).toMatch(ISO_DAY);
      expect(stop.endsOn).toMatch(ISO_DAY);
      expect(stop.endsOn >= stop.startsOn).toBe(true);
    }
  });
});

describe('todayInBrisbane', () => {
  it('rolls over at Brisbane midnight (UTC+10), not at UTC midnight', () => {
    expect(todayInBrisbane(new Date('2026-09-05T13:30:00Z'))).toBe('2026-09-05');
    expect(todayInBrisbane(new Date('2026-09-05T14:30:00Z'))).toBe('2026-09-06');
  });
});

describe('formatStopDates', () => {
  it('names the month once within a month, both across months, and one day alone', () => {
    expect(formatStopDates({ startsOn: '2026-09-04', endsOn: '2026-09-05' })).toBe('4 to 5 Sep');
    expect(formatStopDates({ startsOn: '2026-09-30', endsOn: '2026-10-01' })).toBe(
      '30 Sep to 1 Oct',
    );
    expect(formatStopDates({ startsOn: '2026-09-04', endsOn: '2026-09-04' })).toBe('4 Sep');
  });
});

describe('homepage pathway tiles', () => {
  it('carry no hard-coded event date and no free-entry claim', () => {
    expect(homePathwayItems.length).toBe(3);
    for (const item of homePathwayItems) {
      const text = `${item.label} ${item.title} ${item.detail} ${item.cta}`;
      expect(text).not.toMatch(DAY_RANGE);
      expect(text).not.toMatch(/\bJul\b/);
      expect(text).not.toMatch(/free entry/i);
    }
  });

  it('positive control: the pre-fix tile copy fails the same checks', () => {
    expect('Melbourne 22 to 23 Jul · Sydney 30 to 31 Jul').toMatch(DAY_RANGE);
    expect('Free entry for CCW customers · register for your check-in token').toMatch(
      /free entry/i,
    );
  });

  it('the fallback line states a fact about the page, not a promise of dates', () => {
    expect(NO_UPCOMING_STOPS_COPY).toBe('No upcoming dates listed');
    expect(NO_UPCOMING_STOPS_COPY).not.toMatch(/announce|\bsoon\b|\bcoming\b|to be confirmed/i);
  });
});
