import { describe, expect, it } from 'vitest';

import {
  cookieAuthorisesSession,
  nextPurchaseSurveyCookie,
  PURCHASE_SURVEY_COOKIE_MAX_LENGTH,
  PURCHASE_SURVEY_COOKIE_NAME,
  PURCHASE_SURVEY_TOKEN_TTL_SECONDS,
  signPurchaseSurveyToken,
  verifyPurchaseSurveyToken,
} from './purchase-survey-token';

const NOW = new Date('2026-10-29T00:00:00Z');

describe('purchase survey capability token', () => {
  it('lasts 24 hours under the carsi_svy name', () => {
    expect(PURCHASE_SURVEY_TOKEN_TTL_SECONDS).toBe(60 * 60 * 24);
    expect(PURCHASE_SURVEY_COOKIE_NAME).toBe('carsi_svy');
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

describe('the carsi_svy cookie holds up to three checkouts', () => {
  it('checkout B started after A keeps A authorised (A paid later still works)', () => {
    const afterA = nextPurchaseSurveyCookie(undefined, 'cs_test_a', NOW);
    const afterB = nextPurchaseSurveyCookie(afterA, 'cs_test_b', NOW);
    expect(cookieAuthorisesSession(afterB, 'cs_test_a', NOW)).toBe(true);
    expect(cookieAuthorisesSession(afterB, 'cs_test_b', NOW)).toBe(true);
    expect(cookieAuthorisesSession(afterB, 'cs_test_c', NOW)).toBe(false);
  });

  it('keeps only the three newest, so the cookie stays bounded', () => {
    let value: string | undefined;
    for (const id of ['cs_test_1', 'cs_test_2', 'cs_test_3', 'cs_test_4']) {
      value = nextPurchaseSurveyCookie(value, id, NOW);
    }
    expect(cookieAuthorisesSession(value, 'cs_test_1', NOW)).toBe(false);
    for (const id of ['cs_test_2', 'cs_test_3', 'cs_test_4']) {
      expect(cookieAuthorisesSession(value, id, NOW)).toBe(true);
    }
    expect(value!.length).toBeLessThanOrEqual(PURCHASE_SURVEY_COOKIE_MAX_LENGTH);
  });

  it('drops junk and expired entries from an existing cookie', () => {
    const old = signPurchaseSurveyToken('cs_test_old', new Date(NOW.getTime() - 2 * 24 * 3600 * 1000));
    const value = nextPurchaseSurveyCookie(`<script>~${old}~${'x'.repeat(4000)}`, 'cs_test_new', NOW);
    expect(value.split('~')).toHaveLength(1);
    expect(cookieAuthorisesSession(value, 'cs_test_new', NOW)).toBe(true);
  });

  it('a junk or oversized cookie authorises nothing and never throws', () => {
    for (const junk of [undefined, '', '~~~', 'a~b', 'x'.repeat(5000)]) {
      expect(cookieAuthorisesSession(junk, 'cs_test_a', NOW)).toBe(false);
    }
  });
});
