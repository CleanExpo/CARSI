import { afterEach, describe, expect, it } from 'vitest';

import { isCcwAttendeeOffersEnabled } from './ccw-offers-flag';

const KEY = 'CCW_ATTENDEE_OFFERS_ENABLED';

afterEach(() => {
  delete process.env[KEY];
});

describe('isCcwAttendeeOffersEnabled', () => {
  it('is false when the env var is unset (dark by default)', () => {
    delete process.env[KEY];
    expect(isCcwAttendeeOffersEnabled()).toBe(false);
  });

  it.each(['true', '1', 'yes', 'on', 'TRUE', ' On '])('is true for %j', (value) => {
    process.env[KEY] = value;
    expect(isCcwAttendeeOffersEnabled()).toBe(true);
  });

  it.each(['false', '0', 'no', 'off', ''])('is false for %j', (value) => {
    process.env[KEY] = value;
    expect(isCcwAttendeeOffersEnabled()).toBe(false);
  });
});
