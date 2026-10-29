import { describe, expect, it } from 'vitest';

import {
  buildFirstTouch,
  classifyChannel,
  FIRST_TOUCH_COOKIE_NAME,
  firstTouchCookieHeader,
  firstTouchMetadata,
  LANDING_SECTIONS,
  landingSection,
  parseFirstTouchCookie,
  REFERRER_SOURCES,
  referrerSource,
  serializeFirstTouchCookie,
} from './first-touch';

const SITE = 'carsi.com.au';
const NOW = new Date('2026-10-29T03:04:05.000Z');

describe('referrerSource: a fixed category, never a host string', () => {
  it.each([
    ['www.google.com', 'google'],
    ['google.com.au', 'google'],
    ['www.bing.com', 'bing'],
    ['duckduckgo.com', 'duckduckgo'],
    ['m.facebook.com', 'facebook'],
    ['l.instagram.com', 'instagram'],
    ['www.linkedin.com', 'linkedin'],
    ['lnkd.in', 'linkedin'],
    ['www.youtube.com', 'youtube'],
    ['youtu.be', 'youtube'],
    ['x.com', 'x'],
    ['t.co', 'x'],
    ['twitter.com', 'x'],
    ['old.reddit.com', 'reddit'],
    ['chatgpt.com', 'chatgpt'],
    ['chat.openai.com', 'chatgpt'],
    ['www.perplexity.ai', 'perplexity'],
    ['gemini.google.com', 'gemini'],
    ['copilot.microsoft.com', 'copilot'],
    ['claude.ai', 'claude'],
    ['mail.google.com', 'email'],
    ['outlook.live.com', 'email'],
    ['carsi.com.au', 'internal'],
    ['www.carsi.com.au', 'internal'],
    ['jane-smith.notion.site', 'other'],
    ['0438123456.example.org', 'other'],
    ['www.iicrc.org', 'other'],
    ['notgoogle.com', 'other'],
    ['google.com.evil.example', 'other'],
    ['', ''],
  ])('%s -> %s', (host, expected) => {
    expect(referrerSource(host, SITE)).toBe(expected);
  });

  it('every result is one of the fixed tokens', () => {
    for (const host of ['jane-smith.notion.site', '0438123456.example.org', 'a.b.c.d', '%%%']) {
      expect(REFERRER_SOURCES).toContain(referrerSource(host, SITE));
    }
  });
});

describe('landingSection: a section name from the fixed list, no slugs', () => {
  it.each([
    ['/', 'home'],
    ['', 'home'],
    ['/courses', 'courses'],
    ['/courses/jane-smith', 'courses'],
    ['/courses/moisture-meters', 'courses'],
    ['/for/twelve-queen-street', 'for'],
    ['/for/nsw-builders', 'for'],
    ['/industries/construction', 'industries'],
    ['/pricing?email=a@b.c', 'pricing'],
    ['/courses/0438123456', 'courses'],
    ['/dashboard/student', 'other'],
    ['/jane-smith', 'other'],
    ['/0438123456', 'other'],
  ])('%s -> %s', (path, expected) => {
    expect(landingSection(path)).toBe(expected);
  });

  it('every result is one of the fixed section names', () => {
    for (const path of ['/courses/jane-smith', '/x/y/z', '/for/twelve-queen-street', '/']) {
      expect([...LANDING_SECTIONS, 'home', 'other']).toContain(landingSection(path));
    }
  });
});

describe('classifyChannel (T1a-6)', () => {
  it.each([
    ['www.google.com', 'organic_search'],
    ['www.bing.com', 'organic_search'],
    ['duckduckgo.com', 'organic_search'],
    ['chatgpt.com', 'ai_assistant'],
    ['www.perplexity.ai', 'ai_assistant'],
    ['gemini.google.com', 'ai_assistant'],
    ['copilot.microsoft.com', 'ai_assistant'],
    ['claude.ai', 'ai_assistant'],
    ['www.linkedin.com', 'social'],
    ['m.facebook.com', 'social'],
    ['l.instagram.com', 'social'],
    ['www.youtube.com', 'social'],
    ['mail.google.com', 'email'],
    ['www.iicrc.org', 'referral'],
  ])('%s -> %s', (refHost, expected) => {
    expect(classifyChannel({ refHost, utm: {}, siteHost: SITE })).toBe(expected);
  });

  it('an empty referrer is direct; utm_medium email/social honoured then', () => {
    expect(classifyChannel({ refHost: '', utm: {}, siteHost: SITE })).toBe('direct');
    expect(classifyChannel({ refHost: '', utm: { utm_medium: 'email' }, siteHost: SITE })).toBe('email');
    expect(classifyChannel({ refHost: '', utm: { utm_medium: 'social' }, siteHost: SITE })).toBe('social');
  });

  it('utm_medium=cpc is paid whatever the referrer', () => {
    expect(classifyChannel({ refHost: 'www.google.com', utm: { utm_medium: 'cpc' }, siteHost: SITE })).toBe('paid');
    expect(classifyChannel({ refHost: '', utm: { utm_medium: 'paid_social' }, siteHost: SITE })).toBe('paid');
  });

  it('our own host is not a source', () => {
    expect(classifyChannel({ refHost: 'www.carsi.com.au', utm: {}, siteHost: SITE })).toBe('unknown');
  });
});

describe('buildFirstTouch', () => {
  it('T1a-5: stores only a source category and a section name', () => {
    const ft = buildFirstTouch({
      referrer: 'https://www.google.com/search?q=secret+name',
      landingUrl: 'https://carsi.com.au/courses/jane-smith?email=a%40b.c#frag',
      now: NOW,
      siteHost: SITE,
    });
    expect(ft).toEqual({ ch: 'organic_search', ref: 'google', lp: 'courses', at: '2026-10-29' });
  });

  it.each([
    ['https://jane-smith.notion.site/page', 'https://carsi.com.au/for/twelve-queen-street'],
    ['https://0438123456.example.org/', 'https://carsi.com.au/courses/0438123456'],
  ])('identifying referrer %s and landing %s leave no trace', (referrer, landingUrl) => {
    const ft = buildFirstTouch({ referrer, landingUrl, now: NOW, siteHost: SITE });
    expect(ft?.ref).toBe('other');
    expect(JSON.stringify(ft)).not.toMatch(/jane|smith|notion|0438|twelve|queen|example/);
  });

  it('own-host referrer does not set a first touch', () => {
    expect(
      buildFirstTouch({ referrer: 'https://carsi.com.au/', landingUrl: 'https://carsi.com.au/courses', now: NOW, siteHost: SITE })
    ).toBeNull();
  });

  it('a direct visit records direct, no source, home', () => {
    expect(buildFirstTouch({ referrer: '', landingUrl: 'https://carsi.com.au/', now: NOW, siteHost: SITE })).toEqual({
      ch: 'direct',
      ref: '',
      lp: 'home',
      at: '2026-10-29',
    });
  });

  it('uses utm_medium from the landing URL to classify, without storing it', () => {
    const ft = buildFirstTouch({
      referrer: 'https://www.facebook.com/',
      landingUrl: 'https://carsi.com.au/courses?utm_medium=cpc',
      now: NOW,
      siteHost: SITE,
    });
    expect(ft).toEqual({ ch: 'paid', ref: 'facebook', lp: 'courses', at: '2026-10-29' });
  });

  it('junk never throws', () => {
    expect(() => buildFirstTouch({ referrer: 'not a url', landingUrl: '%%%', now: NOW, siteHost: SITE })).not.toThrow();
  });
});

describe('firstTouchCookieHeader', () => {
  it('writes carsi_ft for 90 days, Path=/, SameSite=Lax, Secure only on https', () => {
    const ft = { ch: 'direct' as const, ref: '' as const, lp: 'home', at: '2026-10-29' };
    const secure = firstTouchCookieHeader(ft, true);
    expect(secure).toContain(`${FIRST_TOUCH_COOKIE_NAME}=`);
    expect(secure).toContain(`Max-Age=${60 * 60 * 24 * 90}`);
    expect(secure).toContain('Path=/');
    expect(secure).toContain('SameSite=Lax');
    expect(secure).toContain('; Secure');
    expect(firstTouchCookieHeader(ft, false)).not.toContain('Secure');
  });
});

describe('parseFirstTouchCookie (T1a-4 hardening, same mapping on read)', () => {
  it('round-trips a serialised value', () => {
    const ft = { ch: 'social' as const, ref: 'linkedin' as const, lp: 'courses', at: '2026-10-29' };
    expect(parseFirstTouchCookie(serializeFirstTouchCookie(ft))).toEqual(ft);
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['html', '<script>alert(1)</script>'],
    ['5 KB string', 'x'.repeat(5 * 1024)],
    ['array', encodeURIComponent(JSON.stringify(['direct', '/']))],
    ['wrong shape', encodeURIComponent(JSON.stringify({ foo: 'bar' }))],
    ['unknown channel', encodeURIComponent(JSON.stringify({ ch: 'evil', ref: '', lp: 'home', at: '2026-10-29' }))],
    ['bad date', encodeURIComponent(JSON.stringify({ ch: 'direct', ref: '', lp: 'home', at: 'yesterday' }))],
    ['bad percent encoding', '%E0%A4%A'],
  ])('returns null for %s', (_label, raw) => {
    expect(() => parseFirstTouchCookie(raw as string | undefined)).not.toThrow();
    expect(parseFirstTouchCookie(raw as string | undefined)).toBeNull();
  });

  it('a planted old cookie with a raw host and a slugged path is reduced to tokens', () => {
    const raw = encodeURIComponent(
      JSON.stringify({ ch: 'referral', ref: 'jane-smith.notion.site', lp: '/for/twelve-queen-street', at: '2026-10-29' })
    );
    expect(parseFirstTouchCookie(raw)).toEqual({ ch: 'referral', ref: 'other', lp: 'for', at: '2026-10-29' });
  });

  it('an old cookie with a known raw host maps to its category', () => {
    const raw = encodeURIComponent(
      JSON.stringify({ ch: 'organic_search', ref: 'www.google.com', lp: '/courses/moisture', at: '2026-10-29' })
    );
    expect(parseFirstTouchCookie(raw)).toEqual({ ch: 'organic_search', ref: 'google', lp: 'courses', at: '2026-10-29' });
  });

  it('nothing from the cookie survives except allowed tokens', () => {
    const raw = encodeURIComponent(
      JSON.stringify({ ch: 'referral', ref: '0438123456.example.org/x?email=a@b.c', lp: 'jane-smith', at: '2026-10-29' })
    );
    const ft = parseFirstTouchCookie(raw);
    expect(ft).toEqual({ ch: 'referral', ref: 'other', lp: 'other', at: '2026-10-29' });
  });
});

describe('firstTouchMetadata', () => {
  it('maps to the four bounded Stripe keys', () => {
    expect(firstTouchMetadata({ ch: 'ai_assistant', ref: 'chatgpt', lp: 'courses', at: '2026-10-29' })).toEqual({
      ft_ch: 'ai_assistant',
      ft_ref: 'chatgpt',
      ft_lp: 'courses',
      ft_at: '2026-10-29',
    });
  });

  it('is empty for no first touch, and omits an empty source', () => {
    expect(firstTouchMetadata(null)).toEqual({});
    expect(firstTouchMetadata({ ch: 'direct', ref: '', lp: 'home', at: '2026-10-29' })).toEqual({
      ft_ch: 'direct',
      ft_lp: 'home',
      ft_at: '2026-10-29',
    });
  });
});
