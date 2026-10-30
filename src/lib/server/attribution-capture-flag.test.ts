import { afterEach, describe, expect, it } from 'vitest';

import { isAttributionCaptureEnabled } from './attribution-capture-flag';

const KEY = 'ATTRIBUTION_CAPTURE_ENABLED';

afterEach(() => {
  delete process.env[KEY];
});

describe('isAttributionCaptureEnabled', () => {
  it('is off when unset (ships dark)', () => {
    delete process.env[KEY];
    expect(isAttributionCaptureEnabled()).toBe(false);
  });

  it.each(['true', '1', 'TRUE', ' 1 '])('is on only for a strict true/1: %j', (value) => {
    process.env[KEY] = value;
    expect(isAttributionCaptureEnabled()).toBe(true);
  });

  it.each(['false', '0', 'yes', 'on', '', 'enabled'])('is off for %j', (value) => {
    process.env[KEY] = value;
    expect(isAttributionCaptureEnabled()).toBe(false);
  });
});
