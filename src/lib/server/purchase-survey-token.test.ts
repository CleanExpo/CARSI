import { describe, expect, it } from 'vitest';

import {
  PURCHASE_SURVEY_COOKIE_PREFIX,
  PURCHASE_SURVEY_TOKEN_TTL_SECONDS,
  purchaseSurveyCookieChanges,
  purchaseSurveyCookieName,
  requestAuthorisesSurvey,
  signPurchaseSurveyToken,
  verifyPurchaseSurveyToken,
} from './purchase-survey-token';

const NOW = new Date('2026-10-29T00:00:00Z');

describe('purchase survey capability token', () => {
  it('lasts 24 hours', () => {
    expect(PURCHASE_SURVEY_TOKEN_TTL_SECONDS).toBe(60 * 60 * 24);
  });

  it('verifies for the session it was issued for', () => {
    const token = signPurchaseSurveyToken('cs_test_a', NOW);
    expect(verifyPurchaseSurveyToken(token, 'cs_test_a', NOW)).toBe(true);
  });

  it('does not verify for another session', () => {
    const token = signPurchaseSurveyToken('cs_test_a', NOW);
    expect(verifyPurchaseSurveyToken(token, 'cs_test_b', NOW)).toBe(false);
  });

  it('does not verify once expired', () => {
    const token = signPurchaseSurveyToken('cs_test_a', NOW);
    const later = new Date(NOW.getTime() + (PURCHASE_SURVEY_TOKEN_TTL_SECONDS + 1) * 1000);
    expect(verifyPurchaseSurveyToken(token, 'cs_test_a', later)).toBe(false);
  });

  it('rejects a tampered expiry or signature, and junk, without throwing', () => {
    const token = signPurchaseSurveyToken('cs_test_a', NOW);
    const [exp, sig] = token.split('.');
    expect(verifyPurchaseSurveyToken(`${Number(exp) + 999999}.${sig}`, 'cs_test_a', NOW)).toBe(false);
    expect(verifyPurchaseSurveyToken(`${exp}.${sig.slice(0, -2)}aa`, 'cs_test_a', NOW)).toBe(false);
    for (const junk of [undefined, '', 'x', '.', '1.2.3', '<script>']) {
      expect(verifyPurchaseSurveyToken(junk, 'cs_test_a', NOW)).toBe(false);
    }
  });
});

describe('one survey cookie per checkout session (GP-662)', () => {
  const HOUR = 3600 * 1000;
  const cookieFor = (id: string, issuedAt = NOW) => ({
    name: purchaseSurveyCookieName(id),
    value: signPurchaseSurveyToken(id, issuedAt),
  });
  const jar = (...cookies: Array<{ name: string; value: string }>) => ({
    get: (name: string) => cookies.find((c) => c.name === name),
  });

  it('names the cookie carsi_svy_ plus 16 hex, the same for the same session only', () => {
    expect(PURCHASE_SURVEY_COOKIE_PREFIX).toBe('carsi_svy_');
    expect(purchaseSurveyCookieName('cs_test_a')).toMatch(/^carsi_svy_[0-9a-f]{16}$/);
    expect(purchaseSurveyCookieName('cs_test_a')).toBe(purchaseSurveyCookieName('cs_test_a'));
    expect(purchaseSurveyCookieName('cs_test_a')).not.toBe(purchaseSurveyCookieName('cs_test_b'));
  });

  it("a start sets only its own session's cookie and touches nothing when two or fewer exist", () => {
    const changes = purchaseSurveyCookieChanges([cookieFor('cs_test_1'), cookieFor('cs_test_2')], 'cs_test_3', NOW);
    expect(changes.set.name).toBe(purchaseSurveyCookieName('cs_test_3'));
    expect(verifyPurchaseSurveyToken(changes.set.value, 'cs_test_3', NOW)).toBe(true);
    expect(changes.expire).toEqual([]);
  });

  it('deletes the oldest beyond the two newest earlier cookies, so at most three remain', () => {
    const existing = [
      cookieFor('cs_test_old', new Date(NOW.getTime() - 3 * HOUR)),
      cookieFor('cs_test_mid', new Date(NOW.getTime() - 2 * HOUR)),
      cookieFor('cs_test_new', new Date(NOW.getTime() - HOUR)),
    ];
    const changes = purchaseSurveyCookieChanges(existing, 'cs_test_next', NOW);
    expect(changes.expire).toEqual([purchaseSurveyCookieName('cs_test_old')]);
  });

  it('in the same second, the cookie sent last counts as newest', () => {
    const existing = ['cs_test_1', 'cs_test_2', 'cs_test_3'].map((id) => cookieFor(id));
    const changes = purchaseSurveyCookieChanges(existing, 'cs_test_4', NOW);
    expect(changes.expire).toEqual([purchaseSurveyCookieName('cs_test_1')]);
  });

  it('deletes expired or malformed survey cookies and ignores every other cookie', () => {
    const expired = cookieFor('cs_test_gone', new Date(NOW.getTime() - 25 * HOUR));
    const junk = { name: purchaseSurveyCookieName('cs_test_junk'), value: '<script>' };
    const other = [
      { name: 'auth_token', value: 'x' },
      { name: 'carsi_svy', value: 'legacy' },
      { name: 'carsi_svy_NOTHEX', value: 'x' },
    ];
    const changes = purchaseSurveyCookieChanges([expired, junk, ...other], 'cs_test_next', NOW);
    expect(changes.expire.sort()).toEqual([expired.name, junk.name].sort());
  });

  it("never deletes the new session's own cookie name", () => {
    const changes = purchaseSurveyCookieChanges([{ name: purchaseSurveyCookieName('cs_test_a'), value: 'junk' }], 'cs_test_a', NOW);
    expect(changes.expire).toEqual([]);
  });

  it("authorises a session only through that session's own cookie", () => {
    const a = cookieFor('cs_test_a');
    expect(requestAuthorisesSurvey(jar(a, cookieFor('cs_test_b')), 'cs_test_a', NOW)).toBe(true);
    expect(requestAuthorisesSurvey(jar(a), 'cs_test_b', NOW)).toBe(false);
    const planted = { name: purchaseSurveyCookieName('cs_test_b'), value: a.value };
    expect(requestAuthorisesSurvey(jar(planted), 'cs_test_b', NOW)).toBe(false);
    expect(requestAuthorisesSurvey(jar(), 'cs_test_a', NOW)).toBe(false);
  });
});
