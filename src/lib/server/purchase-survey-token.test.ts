import { describe, expect, it } from 'vitest';

import {
  newPurchaseSurveyCookieValue,
  PURCHASE_SURVEY_BINDING_METADATA_KEY,
  PURCHASE_SURVEY_COOKIE_NAME,
  PURCHASE_SURVEY_KEY_MAX_AGE_SECONDS,
  PURCHASE_SURVEY_WINDOW_SECONDS,
  purchaseSurveyBinding,
  purchaseSurveyCookieForCheckout,
  purchaseSurveyCookieOptions,
  purchaseSurveyKeyFromCookie,
  sessionAuthorisedForSurvey,
} from './purchase-survey-token';

const NOW = new Date('2026-10-29T00:00:00Z');
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

function boundSession(cookie: string, created = NOW_SECONDS - 60) {
  const key = purchaseSurveyKeyFromCookie(cookie)!;
  return { created, metadata: { [PURCHASE_SURVEY_BINDING_METADATA_KEY]: purchaseSurveyBinding(key) } };
}

describe('purchase survey browser key (GP-662)', () => {
  it('one cookie, carsi_svk, HttpOnly on path / for 30 days; answers accepted for 24 hours', () => {
    expect(PURCHASE_SURVEY_COOKIE_NAME).toBe('carsi_svk');
    expect(PURCHASE_SURVEY_BINDING_METADATA_KEY).toBe('svy_bk');
    expect(PURCHASE_SURVEY_KEY_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 30);
    expect(PURCHASE_SURVEY_WINDOW_SECONDS).toBe(60 * 60 * 24);
    expect(purchaseSurveyCookieOptions(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: PURCHASE_SURVEY_KEY_MAX_AGE_SECONDS,
    });
  });

  it('a new cookie holds a random 128-bit key that verifies; two new cookies differ', () => {
    const a = newPurchaseSurveyCookieValue();
    const b = newPurchaseSurveyCookieValue();
    expect(a).toMatch(/^[0-9a-f]{32}\.[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
    expect(purchaseSurveyKeyFromCookie(a)).toBe(a.slice(0, 32));
  });

  it('a tampered key or signature, or junk, yields no key and never throws', () => {
    const value = newPurchaseSurveyCookieValue();
    const [key, sig] = value.split('.');
    const flipped = (hex: string) => (hex[0] === '0' ? '1' : '0') + hex.slice(1);
    for (const bad of [
      `${flipped(key)}.${sig}`,
      `${key}.${flipped(sig)}`,
      `${key.toUpperCase()}.${sig}`,
      undefined,
      null,
      '',
      '.',
      '<script>',
      'x'.repeat(5000),
      `${value}~${value}`,
    ]) {
      expect(purchaseSurveyKeyFromCookie(bad)).toBeNull();
    }
  });

  it('checkout reuses a valid existing cookie unchanged, so overlapping starts write the same value', () => {
    const existing = newPurchaseSurveyCookieValue();
    const first = purchaseSurveyCookieForCheckout(existing);
    const second = purchaseSurveyCookieForCheckout(existing);
    expect(first).toEqual({ value: existing, key: existing.slice(0, 32) });
    expect(second).toEqual(first);
  });

  it('checkout replaces a missing or forged cookie with a new valid one', () => {
    for (const bad of [undefined, '', `${'a'.repeat(32)}.${'b'.repeat(64)}`]) {
      const fresh = purchaseSurveyCookieForCheckout(bad);
      expect(fresh.value).not.toBe(bad);
      expect(purchaseSurveyKeyFromCookie(fresh.value)).toBe(fresh.key);
    }
  });
});

describe('sessionAuthorisedForSurvey', () => {
  const cookie = newPurchaseSurveyCookieValue();

  it("authorises this browser's own session", () => {
    expect(sessionAuthorisedForSurvey(boundSession(cookie), cookie, NOW)).toBe(true);
  });

  it("refuses another browser's session, a session with no or a malformed binding, and a bad cookie", () => {
    const other = newPurchaseSurveyCookieValue();
    expect(sessionAuthorisedForSurvey(boundSession(other), cookie, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey({ created: NOW_SECONDS, metadata: {} }, cookie, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey({ created: NOW_SECONDS, metadata: null }, cookie, NOW)).toBe(false);
    const truncated = { created: NOW_SECONDS, metadata: { svy_bk: purchaseSurveyBinding(cookie.slice(0, 32)).slice(0, 31) } };
    expect(sessionAuthorisedForSurvey(truncated, cookie, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey(boundSession(cookie), undefined, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey(boundSession(cookie), `${'a'.repeat(32)}.${'b'.repeat(64)}`, NOW)).toBe(false);
  });

  it('the cookie value itself is not the binding: a session storing the raw key is refused', () => {
    const raw = { created: NOW_SECONDS, metadata: { svy_bk: cookie.slice(0, 32) } };
    expect(sessionAuthorisedForSurvey(raw, cookie, NOW)).toBe(false);
  });

  it('accepts for 24 hours after the session was created, with 5 minutes of clock allowance', () => {
    const day = PURCHASE_SURVEY_WINDOW_SECONDS;
    expect(sessionAuthorisedForSurvey(boundSession(cookie, NOW_SECONDS - day), cookie, NOW)).toBe(true);
    expect(sessionAuthorisedForSurvey(boundSession(cookie, NOW_SECONDS - day - 1), cookie, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey(boundSession(cookie, NOW_SECONDS + 300), cookie, NOW)).toBe(true);
    expect(sessionAuthorisedForSurvey(boundSession(cookie, NOW_SECONDS + 301), cookie, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey({ ...boundSession(cookie), created: null }, cookie, NOW)).toBe(false);
  });
});
