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
    expect(calendar.posts.some((p) => p.caption.includes('carpet and upholstery cleaning'))).toBe(
      true
    );
    expect(calendar.posts.some((p) => p.caption.includes('Toowoomba'))).toBe(false);
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
  it('the neutral-wording templates used as the fallback are all compliant', () => {
    const neutral = buildFallbackPosts({ businessName: '', trade: '', town: '', services: '' });
    expect(neutral.length).toBe(buildFallbackPosts(voice).length);
    for (const post of neutral) {
      expect(
        findComplianceIssues(`${post.theme} ${post.caption} ${post.hashtags.join(' ')}`)
      ).toEqual([]);
    }
  });

  it('is built only from the vetted template set', () => {
    const vetted = new Set(buildFallbackPosts(voice).map((p) => p.caption));
    const calendar = assembleCalendar(voice, start);
    for (const post of calendar.posts) expect(vetted.has(post.caption)).toBe(true);
  });

  it('accepts no model input at all', () => {
    // One parameter for the voice and one for the start date: nothing else can be passed in.
    expect(assembleCalendar.length).toBe(2);
  });

  it.each(['1', '100', 'No. 1', '#1 Town'])(
    'still yields 30 compliant posts when the town is %s (Codex P1, head 0b717beb)',
    (town) => {
      const calendar = assembleCalendar(
        { businessName: 'Acme', trade: 'Plumbing', town, services: 'Plumbing' },
        start
      );
      expect(calendar.posts).toHaveLength(CALENDAR_DAYS);
      for (const post of calendar.posts) {
        expect(
          findComplianceIssues(`${post.theme} ${post.caption} ${post.hashtags.join(' ')}`)
        ).toEqual([]);
      }
    }
  );
});

describe('calendar makes no factual claims about the member (Codex P1, head 9aa848f3)', () => {
  const empty = { businessName: '', trade: '', town: '', services: '' };
  const posts = assembleCalendar(empty, new Date('2026-11-09')).posts;
  const invented = [
    /recent local job/i,
    /we found the cause/i,
    /we live and work locally/i,
    /turn up on time/i,
    /arrive in the window/i,
    /our team keeps learning/i,
    /happy customer/i,
    /leave the place tidy/i,
    /small local business/i,
    /we love working in this community/i,
    /proud to work across/i,
  ];

  it('still gives 30 compliant posts for a profile with no evidence', () => {
    expect(posts).toHaveLength(30);
  });

  it.each(invented.map((r) => [r.source, r] as const))('never says "%s"', (_s, re) => {
    expect(posts.filter((p) => re.test(p.caption))).toEqual([]);
  });

  it('turns job, team and practice posts into fill-in prompts', () => {
    for (const theme of ['Job story', 'Meet the team', 'How we work', 'Training']) {
      const themed = posts.filter((p) => p.theme === theme);
      expect(themed.length).toBeGreaterThan(0);
      for (const p of themed) expect(p.caption).toMatch(/\[[^\]]+\]/);
    }
  });
});

describe('no template asserts customer activity (Codex P1, head ce8eb97f)', () => {
  const posts = assembleCalendar(
    { businessName: '', trade: '', town: '', services: '' },
    new Date('2026-11-09')
  ).posts;
  it('never thanks customers as a fact', () => {
    expect(posts.filter((p) => /thanks to everyone who has booked/i.test(p.caption))).toEqual([]);
  });
});

describe('every template reads correctly and claims nothing for any trade (GP-634 class sweep)', () => {
  // One trade for each fixed label, plus an unlisted trade and no trade at all.
  const trades = [
    'Carpet cleaning',
    'Mould',
    'Fire and smoke',
    'Flood restoration',
    'Pressure washing',
    'Window cleaner',
    'Cleaner',
    'Plumber',
    'Electrician',
    'Painter',
    'Roofer',
    'Pest control',
    'Tiler',
    'Air con',
    'Landscaper',
    'Builder',
    'Locksmith',
    'Mobile mechanic',
    '',
  ];
  const unproven = [
    /our work/i, // the old empty-trade fallback ("Quick our work tip", "Need our work?")
    /\ba (?:[aeiou])/i, // "a electrical job", "a air conditioning job"
    /business we rate/i,
    /busy season/i,
    /here's what you can/i,
    /usually means/i,
    /makes a real difference/i,
    /early signs are easy to miss/i,
  ];

  it.each(trades)('trade "%s": 30 posts, plain grammar, no unproven statement', (trade) => {
    const posts = assembleCalendar(
      { businessName: '', trade, town: '', services: '' },
      new Date('2026-11-09')
    ).posts;
    expect(posts).toHaveLength(30);
    for (const p of posts) {
      for (const re of unproven) expect(p.caption, p.caption).not.toMatch(re);
      expect(p.caption, p.caption).not.toMatch(/ {2}|\s[.,?]/);
    }
  });
});
