import { describe, expect, it } from 'vitest';

import {
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
