import { describe, it, expect } from 'vitest';

import {
  buildCalendarCourseEntries,
  groupCoursesByTopic,
  UNCATEGORISED_TOPIC,
  type CalendarCourse,
} from './carsi-course-listing';
// The excluded brand is named ONLY in event-exclusions.ts — the chokepoint that removes it and
// the only path the terminology guard exempts. Fixtures are derived from that list rather than
// hardcoded, so this test covers every excluded term and follows the list if it ever changes.
import { EXCLUDED_TERMS } from './event-exclusions';

const course = (over: Partial<CalendarCourse> = {}): CalendarCourse => ({
  slug: 'introduction-to-water-damage-restoration',
  title: 'Introduction to Water Damage Restoration',
  short_description: 'Categories of water, classes of loss, and the core drying workflow.',
  category: 'Water Damage Restoration',
  is_free: false,
  price_aud: 29,
  ...over,
});

describe('CARSI course entries for the calendar', () => {
  it('positive control: a normal course produces an entry', () => {
    // Without this, a builder that drops everything and a genuinely empty catalogue are
    // indistinguishable in every test below.
    const [entry] = buildCalendarCourseEntries([course()]);
    expect(entry).toBeDefined();
    expect(entry.title).toBe('Introduction to Water Damage Restoration');
    expect(entry.href).toBe('/courses/introduction-to-water-damage-restoration');
  });

  it('NEVER invents a date', () => {
    // The whole point. CARSI courses are self-paced and the schema carries no start date, so a
    // date on this surface could only have been fabricated.
    const [entry] = buildCalendarCourseEntries([course()]);
    expect(entry).not.toHaveProperty('date');
    expect(entry).not.toHaveProperty('startDate');
    expect(entry.availability).toBe('Start any time — self-paced');
    // A date-shaped string in the availability text would defeat this just as thoroughly.
    expect(entry.availability).not.toMatch(/\d{1,2}[ /-]\d{1,2}|\b20\d\d\b/);
  });

  it('excludes every founder-excluded brand, even though these are CARSI courses', () => {
    // Defence in depth. Course titles come from the admin session, not from this repo, so
    // "it cannot appear here" is an assumption rather than a guarantee.
    expect(EXCLUDED_TERMS.length).toBeGreaterThan(0); // precondition: a vacuous list would pass
    const excluded = EXCLUDED_TERMS.flatMap((term, i) => [
      course({ slug: `excluded-${i}-lower`, title: `${term} Business Coaching` }),
      course({ slug: `excluded-${i}-upper`, title: `${term.toUpperCase()} Masterclass` }),
    ]);
    const entries = buildCalendarCourseEntries([course(), ...excluded]);
    expect(entries).toHaveLength(1);
    const titles = entries.map((e) => e.title).join(' ').toLowerCase();
    for (const term of EXCLUDED_TERMS) expect(titles).not.toContain(term);
  });

  it('drops rows with no slug or no title rather than rendering a broken link', () => {
    const entries = buildCalendarCourseEntries([
      course(),
      course({ slug: '', title: 'No slug' }),
      course({ slug: 'no-title', title: '' }),
    ]);
    expect(entries).toHaveLength(1);
  });

  it('falls back to a topic label when a course has no category', () => {
    // 29 of 80 live courses had a null category on 2026-09-07; without this they would all
    // group under an empty heading.
    const [entry] = buildCalendarCourseEntries([course({ category: null })]);
    expect(entry.topic).toBe(UNCATEGORISED_TOPIC);
  });

  it('treats a whitespace-only category as missing', () => {
    const [entry] = buildCalendarCourseEntries([course({ category: '   ' })]);
    expect(entry.topic).toBe(UNCATEGORISED_TOPIC);
  });

  it('reads free correctly from either the flag or the price', () => {
    expect(buildCalendarCourseEntries([course({ is_free: true, price_aud: 0 })])[0].isFree).toBe(true);
    expect(buildCalendarCourseEntries([course({ is_free: false, price_aud: '0' })])[0].isFree).toBe(true);
    expect(buildCalendarCourseEntries([course({ is_free: false, price_aud: 49 })])[0].isFree).toBe(false);
    // A malformed price must not read as free — that would advertise a paid course at no cost.
    expect(buildCalendarCourseEntries([course({ is_free: false, price_aud: 'not-a-number' })])[0].isFree).toBe(false);
  });

  it('orders alphabetically so the page does not reshuffle on every admin save', () => {
    const entries = buildCalendarCourseEntries([
      course({ slug: 'c', title: 'Zinc Roofing' }),
      course({ slug: 'a', title: 'Applied Drying' }),
      course({ slug: 'b', title: 'Mould Basics' }),
    ]);
    expect(entries.map((e) => e.title)).toEqual(['Applied Drying', 'Mould Basics', 'Zinc Roofing']);
  });

  it('an empty catalogue yields an empty list, not a crash', () => {
    expect(buildCalendarCourseEntries([])).toEqual([]);
  });
});

describe('grouping by topic', () => {
  it('groups and orders topics alphabetically', () => {
    const grouped = groupCoursesByTopic(
      buildCalendarCourseEntries([
        course({ slug: 'w1', title: 'Water One', category: 'Water Damage Restoration' }),
        course({ slug: 'm1', title: 'Mould One', category: 'Microbial & Infection Control' }),
        course({ slug: 'w2', title: 'Water Two', category: 'Water Damage Restoration' }),
      ]),
    );
    expect(grouped.map((g) => g.topic)).toEqual([
      'Microbial & Infection Control',
      'Water Damage Restoration',
    ]);
    expect(grouped[1].courses.map((c) => c.title)).toEqual(['Water One', 'Water Two']);
  });

  it('every input course survives grouping', () => {
    // Catches a grouping bug that silently drops courses — the page would look plausible and
    // simply not sell whatever went missing.
    const entries = buildCalendarCourseEntries([
      course({ slug: 'a', title: 'A', category: 'X' }),
      course({ slug: 'b', title: 'B', category: null }),
      course({ slug: 'c', title: 'C', category: 'Y' }),
    ]);
    const grouped = groupCoursesByTopic(entries);
    expect(grouped.reduce((n, g) => n + g.courses.length, 0)).toBe(entries.length);
  });
});
