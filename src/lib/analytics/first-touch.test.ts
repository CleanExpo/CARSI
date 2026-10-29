import { describe, expect, it } from 'vitest';

import {
  buildFirstTouch,
  classifyChannel,
  FIRST_TOUCH_COOKIE_NAME,
  firstTouchCookieHeader,
  firstTouchMetadata,
  parseFirstTouchCookie,
  serializeFirstTouchCookie,
} from './first-touch';

const SITE = 'carsi.com.au';
const NOW = new Date('2026-10-29T03:04:05.000Z');

describe('classifyChannel (T1a-6)', () => {
  it.each([
    ['www.google.com', 'organic_search'],
    ['google.com.au', 'organic_search'],
    ['www.bing.com', 'organic_search'],
    ['duckduckgo.com', 'organic_search'],
    ['chatgpt.com', 'ai_assistant'],
    ['chat.openai.com', 'ai_assistant'],
    ['www.perplexity.ai', 'ai_assistant'],
    ['perplexity.ai', 'ai_assistant'],
    ['gemini.google.com', 'ai_assistant'],
    ['copilot.microsoft.com', 'ai_assistant'],
    ['claude.ai', 'ai_assistant'],
    ['www.linkedin.com', 'social'],
    ['lnkd.in', 'social'],
    ['m.facebook.com', 'social'],
    ['l.instagram.com', 'social'],
    ['www.youtube.com', 'social'],
    ['mail.google.com', 'email'],
    ['outlook.live.com', 'email'],
    ['www.iicrc.org', 'referral'],
  ])('%s -> %s', (refHost, expected) => {
    expect(classifyChannel({ refHost, utm: {}, siteHost: SITE })).toBe(expected);
  });

  it('an empty referrer is direct', () => {
    expect(classifyChannel({ refHost: '', utm: {}, siteHost: SITE })).toBe('direct');
  });

  it('utm_medium=cpc is paid whatever the referrer', () => {
    expect(classifyChannel({ refHost: 'www.google.com', utm: { utm_medium: 'cpc' }, siteHost: SITE })).toBe(
      'paid'
    );
    expect(classifyChannel({ refHost: '', utm: { utm_medium: 'paid_social' }, siteHost: SITE })).toBe('paid');
  });

  it('utm_medium=email and social are honoured when the referrer is empty', () => {
    expect(classifyChannel({ refHost: '', utm: { utm_medium: 'email' }, siteHost: SITE })).toBe('email');
    expect(classifyChannel({ refHost: '', utm: { utm_medium: 'social' }, siteHost: SITE })).toBe('social');
  });

  it('a referrer on our own host is not a source', () => {
    expect(classifyChannel({ refHost: 'carsi.com.au', utm: {}, siteHost: SITE })).toBe('unknown');
    expect(classifyChannel({ refHost: 'www.carsi.com.au', utm: {}, siteHost: SITE })).toBe('unknown');
  });
});

describe('buildFirstTouch', () => {
  it('T1a-5: keeps the referrer host only, never the search query', () => {
    const ft = buildFirstTouch({
      referrer: 'https://www.google.com/search?q=secret+name&email=a%40b.c',
      landingUrl: 'https://carsi.com.au/courses/moisture?utm_source=x&email=a%40b.c#frag',
      now: NOW,
      siteHost: SITE,
    });
    expect(ft).toEqual({
      ch: 'organic_search',
      ref: 'www.google.com',
      lp: '/courses/moisture',
      at: '2026-10-29',
    });
    expect(JSON.stringify(ft)).not.toMatch(/secret|email|@|utm_source|frag/);
  });

  it('own-host referrer does not set a first touch', () => {
    expect(
      buildFirstTouch({
        referrer: 'https://carsi.com.au/',
        landingUrl: 'https://carsi.com.au/courses',
        now: NOW,
        siteHost: SITE,
      })
    ).toBeNull();
  });

  it('a direct visit records the direct channel and the landing path', () => {
    expect(
      buildFirstTouch({ referrer: '', landingUrl: 'https://carsi.com.au/', now: NOW, siteHost: SITE })
    ).toEqual({ ch: 'direct', ref: '', lp: '/', at: '2026-10-29' });
  });

  it('uses utm_medium from the landing URL to classify, without storing it', () => {
    const ft = buildFirstTouch({
      referrer: 'https://www.facebook.com/',
      landingUrl: 'https://carsi.com.au/courses?utm_medium=cpc',
      now: NOW,
      siteHost: SITE,
    });
    expect(ft?.ch).toBe('paid');
    expect(ft?.lp).toBe('/courses');
  });

  it('a junk referrer or landing URL never throws', () => {
    expect(() =>
      buildFirstTouch({ referrer: 'not a url', landingUrl: '%%%', now: NOW, siteHost: SITE })
    ).not.toThrow();
  });

  it('bounds the landing path to 200 characters and the host to 100', () => {
    const ft = buildFirstTouch({
      referrer: `https://${'a'.repeat(120)}.example.com/`,
      landingUrl: `https://carsi.com.au/${'p'.repeat(400)}`,
      now: NOW,
      siteHost: SITE,
    });
    expect(ft?.ref.length).toBeLessThanOrEqual(100);
    expect(ft?.lp.length).toBeLessThanOrEqual(200);
  });
});

describe('firstTouchCookieHeader', () => {
  it('writes carsi_ft for 90 days, Path=/, SameSite=Lax, Secure only on https', () => {
    const ft = { ch: 'direct' as const, ref: '', lp: '/', at: '2026-10-29' };
    const secure = firstTouchCookieHeader(ft, true);
    expect(secure).toContain(`${FIRST_TOUCH_COOKIE_NAME}=`);
    expect(secure).toContain(`Max-Age=${60 * 60 * 24 * 90}`);
    expect(secure).toContain('Path=/');
    expect(secure).toContain('SameSite=Lax');
    expect(secure).toContain('; Secure');
    expect(firstTouchCookieHeader(ft, false)).not.toContain('Secure');
  });
});

describe('parseFirstTouchCookie (T1a-4 hardening)', () => {
  it('round-trips a serialised value', () => {
    const ft = { ch: 'social' as const, ref: 'www.linkedin.com', lp: '/courses/x', at: '2026-10-29' };
    expect(parseFirstTouchCookie(serializeFirstTouchCookie(ft))).toEqual(ft);
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['html', '<script>alert(1)</script>'],
    ['5 KB string', 'x'.repeat(5 * 1024)],
    ['array', encodeURIComponent(JSON.stringify(['direct', '/']))],
    ['wrong shape', encodeURIComponent(JSON.stringify({ foo: 'bar' }))],
    ['unknown channel', encodeURIComponent(JSON.stringify({ ch: 'evil', ref: '', lp: '/', at: '2026-10-29' }))],
    ['bad date', encodeURIComponent(JSON.stringify({ ch: 'direct', ref: '', lp: '/', at: 'yesterday' }))],
    ['bad percent encoding', '%E0%A4%A'],
  ])('returns null for %s', (_label, raw) => {
    expect(() => parseFirstTouchCookie(raw as string | undefined)).not.toThrow();
    expect(parseFirstTouchCookie(raw as string | undefined)).toBeNull();
  });

  it('strips any query or fragment and email-shaped text smuggled into the cookie', () => {
    const raw = encodeURIComponent(
      JSON.stringify({
        ch: 'referral',
        ref: 'evil.example/x?email=a@b.c',
        lp: '/courses?email=a@b.c#x',
        at: '2026-10-29',
      })
    );
    const ft = parseFirstTouchCookie(raw);
    expect(ft?.lp).toBe('/courses');
    expect(JSON.stringify(ft)).not.toContain('@');
    expect(JSON.stringify(ft)).not.toContain('?');
  });
});

describe('firstTouchMetadata', () => {
  it('maps to the four bounded Stripe keys', () => {
    const md = firstTouchMetadata({ ch: 'ai_assistant', ref: 'chatgpt.com', lp: '/courses/x', at: '2026-10-29' });
    expect(md).toEqual({ ft_ch: 'ai_assistant', ft_ref: 'chatgpt.com', ft_lp: '/courses/x', ft_at: '2026-10-29' });
    for (const [k, v] of Object.entries(md)) {
      expect(k.length).toBeLessThanOrEqual(40);
      expect(v.length).toBeLessThanOrEqual(500);
    }
  });

  it('is empty for no first touch, and omits an empty referrer', () => {
    expect(firstTouchMetadata(null)).toEqual({});
    expect(firstTouchMetadata({ ch: 'direct', ref: '', lp: '/', at: '2026-10-29' })).toEqual({
      ft_ch: 'direct',
      ft_lp: '/',
      ft_at: '2026-10-29',
    });
  });
});
