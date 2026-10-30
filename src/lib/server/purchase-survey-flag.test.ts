import { afterEach, describe, expect, it } from 'vitest';

import { isPurchaseSurveyEnabled } from './purchase-survey-flag';

const KEY = 'PURCHASE_SURVEY_ENABLED';

afterEach(() => {
  delete process.env[KEY];
});

describe('isPurchaseSurveyEnabled', () => {
  it('is off when unset (ships dark)', () => {
    delete process.env[KEY];
    expect(isPurchaseSurveyEnabled()).toBe(false);
  });

  it.each(['true', '1', 'TRUE', ' 1 '])('is on only for a strict true/1: %j', (value) => {
    process.env[KEY] = value;
    expect(isPurchaseSurveyEnabled()).toBe(true);
  });

  it.each(['false', '0', 'yes', 'on', '', 'enabled'])('is off for %j', (value) => {
    process.env[KEY] = value;
    expect(isPurchaseSurveyEnabled()).toBe(false);
  });
});
