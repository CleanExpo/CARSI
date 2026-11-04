import { describe, expect, it } from 'vitest';

import {
  parsePurchaseSurveyKey,
  PURCHASE_SURVEY_BINDING_METADATA_KEY,
  PURCHASE_SURVEY_WINDOW_SECONDS,
  purchaseSurveyBinding,
  sessionAuthorisedForSurvey,
} from './purchase-survey-token';

const NOW = new Date('2026-10-29T00:00:00Z');
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);
const KEY = '00112233445566778899aabbccddeeff';
const OTHER = 'ffeeddccbbaa99887766554433221100';

function boundSession(key: string, created = NOW_SECONDS - 60) {
  return { created, metadata: { [PURCHASE_SURVEY_BINDING_METADATA_KEY]: purchaseSurveyBinding(key) } };
}

describe('purchase survey tab key (GP-662)', () => {
  it('binding goes in svy_bk; answers are accepted for 24 hours', () => {
    expect(PURCHASE_SURVEY_BINDING_METADATA_KEY).toBe('svy_bk');
    expect(PURCHASE_SURVEY_WINDOW_SECONDS).toBe(60 * 60 * 24);
  });

  it('accepts only 32 lower-case hex characters as a key', () => {
    expect(parsePurchaseSurveyKey(KEY)).toBe(KEY);
    for (const bad of [undefined, null, '', KEY.toUpperCase(), KEY.slice(1), `${KEY}0`, `${KEY.slice(0, 31)}g`, 42, { KEY }, [KEY]]) {
      expect(parsePurchaseSurveyKey(bad)).toBeNull();
    }
  });

  it('the binding is 32 hex, stable for one key, different per key, and not the key itself', () => {
    expect(purchaseSurveyBinding(KEY)).toMatch(/^[0-9a-f]{32}$/);
    expect(purchaseSurveyBinding(KEY)).toBe(purchaseSurveyBinding(KEY));
    expect(purchaseSurveyBinding(KEY)).not.toBe(purchaseSurveyBinding(OTHER));
    expect(purchaseSurveyBinding(KEY)).not.toBe(KEY);
  });
});

describe('sessionAuthorisedForSurvey', () => {
  it("authorises the tab's own session", () => {
    expect(sessionAuthorisedForSurvey(boundSession(KEY), KEY, NOW)).toBe(true);
  });

  it("refuses another tab's session, a missing or malformed binding, and a bad key", () => {
    expect(sessionAuthorisedForSurvey(boundSession(OTHER), KEY, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey({ created: NOW_SECONDS, metadata: {} }, KEY, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey({ created: NOW_SECONDS, metadata: null }, KEY, NOW)).toBe(false);
    const truncated = { created: NOW_SECONDS, metadata: { svy_bk: purchaseSurveyBinding(KEY).slice(0, 31) } };
    expect(sessionAuthorisedForSurvey(truncated, KEY, NOW)).toBe(false);
    for (const bad of [undefined, '', KEY.toUpperCase(), purchaseSurveyBinding(KEY)]) {
      expect(sessionAuthorisedForSurvey(boundSession(KEY), bad, NOW)).toBe(false);
    }
  });

  it('a session that stored the raw key instead of its binding is refused', () => {
    expect(sessionAuthorisedForSurvey({ created: NOW_SECONDS, metadata: { svy_bk: KEY } }, KEY, NOW)).toBe(false);
  });

  it('accepts for 24 hours after the session was created, with 5 minutes of clock allowance', () => {
    const day = PURCHASE_SURVEY_WINDOW_SECONDS;
    expect(sessionAuthorisedForSurvey(boundSession(KEY, NOW_SECONDS - day), KEY, NOW)).toBe(true);
    expect(sessionAuthorisedForSurvey(boundSession(KEY, NOW_SECONDS - day - 1), KEY, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey(boundSession(KEY, NOW_SECONDS + 300), KEY, NOW)).toBe(true);
    expect(sessionAuthorisedForSurvey(boundSession(KEY, NOW_SECONDS + 301), KEY, NOW)).toBe(false);
    expect(sessionAuthorisedForSurvey({ ...boundSession(KEY), created: null }, KEY, NOW)).toBe(false);
  });
});
