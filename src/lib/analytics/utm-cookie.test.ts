import { describe, expect, it } from 'vitest';

import { parseUtmCookie, pickUtmValues, serializeUtmCookie, utmCookieHeader } from './utm-cookie';

describe('utm cookie', () => {
  it('round-trips the five utm keys', () => {
    const values = {
      utm_source: 'synthex',
      utm_medium: 'email',
      utm_campaign: 'carsi_paid_enrol_2026_10',
      utm_content: 'hero-a',
      utm_term: 'mould course',
    };
    expect(parseUtmCookie(serializeUtmCookie(values))).toEqual(values);
  });

  it('drops keys outside the utm set', () => {
    expect(pickUtmValues({ utm_source: 'fb', gclid: 'abc', discount_id: 'd1', slug: 'x' })).toEqual({
      utm_source: 'fb',
    });
  });

  it('strips unsafe characters and caps length', () => {
    const out = pickUtmValues({ utm_source: '<script>alert(1)</script>', utm_campaign: 'a'.repeat(300) });
    expect(out.utm_source).toBe('scriptalert1/script');
    expect(out.utm_campaign).toHaveLength(100);
  });

  it('ignores non-string and empty values', () => {
    expect(pickUtmValues({ utm_source: 7, utm_medium: '', utm_campaign: '   ' })).toEqual({});
  });

  it('never throws on malformed cookies', () => {
    for (const raw of [undefined, null, '', '%E0%A4%A', 'not-json', '[1,2]', 'null', '"str"']) {
      expect(parseUtmCookie(raw)).toEqual({});
    }
  });

  it('accepts a value the cookie store already decoded', () => {
    expect(parseUtmCookie('{"utm_source":"google"}')).toEqual({ utm_source: 'google' });
  });

  it('writes no cookie when every utm value cleans to empty, so a good campaign survives', () => {
    expect(utmCookieHeader({ utm_source: '<<>>', utm_medium: '   ' }, true)).toBeNull();
    expect(utmCookieHeader({}, true)).toBeNull();
  });

  it('builds the cookie from cleaned values, Secure only on https', () => {
    const header = utmCookieHeader({ utm_source: 'synthex', gclid: 'x' }, true);
    expect(header).toBe(
      `carsi_utm=${serializeUtmCookie({ utm_source: 'synthex' })}; Max-Age=2592000; Path=/; SameSite=Lax; Secure`
    );
    expect(utmCookieHeader({ utm_source: 'synthex' }, false)).not.toContain('Secure');
  });
});
