import { describe, expect, it } from 'vitest';

import { findComplianceIssues } from './compliance';
import { assembleCalendar, buildFallbackPosts, CALENDAR_DAYS } from './social-calendar';

const voice = {
  businessName: 'Downs Carpet Care',
  trade: 'Carpet & upholstery',
  town: 'Toowoomba',
  services: 'Carpet cleaning, rug cleaning, upholstery',
};

describe('social calendar', () => {
  const start = new Date('2026-11-09T00:00:00Z');

  it('always yields exactly 30 dated items in the trade voice', () => {
    const calendar = assembleCalendar(voice, start);
    expect(calendar.posts).toHaveLength(CALENDAR_DAYS);
    expect(calendar.posts[0]).toMatchObject({ day: 1, date: '2026-11-09' });
    expect(calendar.posts[29]).toMatchObject({ day: 30, date: '2026-12-08' });
    expect(calendar.posts.some((p) => p.caption.includes('Toowoomba'))).toBe(true);
    expect(calendar.source).toBe('template');
  });

  it('every template post passes the compliance filter', () => {
    for (const post of buildFallbackPosts(voice)) {
      expect(findComplianceIssues(`${post.theme} ${post.caption}`)).toEqual([]);
    }
  });

  // Codex P1 x4 (heads 0a953a79, c3b52247, 95f39114, bc601506): a word filter cannot prove that
  // free-form model text is claim-free. The member calendar is therefore built only from the
  // vetted template set; no model text can reach it.
  it('is built only from the vetted template set', () => {
    const vetted = new Set(buildFallbackPosts(voice).map((p) => p.caption));
    const calendar = assembleCalendar(voice, start);
    for (const post of calendar.posts) expect(vetted.has(post.caption)).toBe(true);
  });

  it('accepts no model input at all', () => {
    // One parameter for the voice and one for the start date: nothing else can be passed in.
    expect(assembleCalendar.length).toBe(2);
  });
});
