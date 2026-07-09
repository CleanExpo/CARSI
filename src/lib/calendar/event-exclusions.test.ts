import { describe, expect, it } from 'vitest';

import { filterExcludedEvents, isExcludedEvent } from './event-exclusions';

describe('calendar event exclusions — COACH8 must never appear', () => {
  it('flags an excluded brand in the title', () => {
    expect(isExcludedEvent({ title: 'COACH8 Masterclass' })).toBe(true);
    expect(isExcludedEvent({ title: 'Coach 8 workshop' })).toBe(true);
  });

  it('flags an excluded brand in the organiser or url', () => {
    expect(isExcludedEvent({ organiser_name: 'Coach8 Pty Ltd' })).toBe(true);
    expect(isExcludedEvent({ event_url: 'https://coach8.example/event' })).toBe(true);
  });

  it('leaves legitimate events untouched', () => {
    expect(isExcludedEvent({ title: 'IICRC WRT Course', organiser_name: 'CARSI' })).toBe(false);
  });

  it('removes every excluded event from a list', () => {
    const events = [
      { title: 'RIA Convention' },
      { title: 'COACH8 event' },
      { title: 'IICRC AIM', organiser_name: 'IICRC' },
      { title: 'Talk', event_url: 'https://coach8.io' },
    ];
    const kept = filterExcludedEvents(events);
    expect(kept).toHaveLength(2);
    expect(kept.map((e) => e.title)).toEqual(['RIA Convention', 'IICRC AIM']);
  });
});
