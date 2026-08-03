import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isIicrcCecAutoSubmitEnabled } from './iicrc-cec-config';

/**
 * Licence-critical (CLAUDE.md): auto-submission emails renewals@iicrcnet.org and
 * asserts a CEC claim. That claim is valid only after per-course IICRC approval
 * confirmed by the founder. The gate must therefore be FAIL-CLOSED — absence of
 * configuration means "do not submit".
 *
 * Regression: it previously defaulted to ON, so an unset env var sent a live
 * submission for a course with no approval (2026-07-17).
 */
describe('isIicrcCecAutoSubmitEnabled — fail-closed (licence-critical)', () => {
  const original = process.env.IICRC_CEC_AUTO_SUBMIT;

  beforeEach(() => {
    delete process.env.IICRC_CEC_AUTO_SUBMIT;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.IICRC_CEC_AUTO_SUBMIT;
    else process.env.IICRC_CEC_AUTO_SUBMIT = original;
  });

  it('is DISABLED when the env var is unset — the regression that emailed the IICRC', () => {
    expect(isIicrcCecAutoSubmitEnabled()).toBe(false);
  });

  it('is DISABLED when the env var is empty or whitespace', () => {
    process.env.IICRC_CEC_AUTO_SUBMIT = '   ';
    expect(isIicrcCecAutoSubmitEnabled()).toBe(false);
  });

  it.each(['maybe', 'enabled', 'TRUE_ISH', 'ON!', '2', 'yes please'])(
    'is DISABLED for the unrecognised value %s — never guess consent',
    (value) => {
      process.env.IICRC_CEC_AUTO_SUBMIT = value;
      expect(isIicrcCecAutoSubmitEnabled()).toBe(false);
    },
  );

  it.each(['false', '0', 'no', 'off'])('stays DISABLED for the explicit opt-out %s', (value) => {
    process.env.IICRC_CEC_AUTO_SUBMIT = value;
    expect(isIicrcCecAutoSubmitEnabled()).toBe(false);
  });

  it.each(['true', '1', 'yes', 'on', 'TRUE', 'On', ' yes '])(
    'is ENABLED only on the explicit opt-in %s',
    (value) => {
      process.env.IICRC_CEC_AUTO_SUBMIT = value;
      expect(isIicrcCecAutoSubmitEnabled()).toBe(true);
    },
  );
});
