import { describe, expect, it } from 'vitest';

import { decideCronAuth } from './cron-auth';

/**
 * WS5 — cron auth must FAIL CLOSED. The bug: routes compared the header to
 * `Bearer ${process.env.CRON_SECRET}` with no unset-guard, so when CRON_SECRET was
 * unset the literal `Bearer undefined` matched and the job ran. decideCronAuth is
 * the pure core: 503 when the secret is unset/blank, constant-time compare otherwise.
 */
describe('decideCronAuth', () => {
  it('503s (fail closed) when the secret is unset — Bearer undefined can never pass', () => {
    expect(decideCronAuth('Bearer undefined', undefined)).toEqual({
      ok: false,
      status: 503,
      message: expect.any(String),
    });
    expect(decideCronAuth('Bearer undefined', '').ok).toBe(false);
    expect(decideCronAuth('Bearer undefined', '   ').ok).toBe(false);
    expect(decideCronAuth('Bearer undefined', '   ')).toMatchObject({ status: 503 });
  });

  it('authorises the correct bearer token when the secret is set', () => {
    expect(decideCronAuth('Bearer s3cret-value', 's3cret-value')).toEqual({ ok: true });
    // tolerant of surrounding whitespace in the env value
    expect(decideCronAuth('Bearer s3cret-value', '  s3cret-value  ')).toEqual({ ok: true });
  });

  it('401s a wrong or missing token when the secret is set', () => {
    expect(decideCronAuth('Bearer wrong', 's3cret-value')).toMatchObject({ ok: false, status: 401 });
    expect(decideCronAuth('', 's3cret-value')).toMatchObject({ ok: false, status: 401 });
    expect(decideCronAuth(null, 's3cret-value')).toMatchObject({ ok: false, status: 401 });
    expect(decideCronAuth('Bearer ', 's3cret-value')).toMatchObject({ ok: false, status: 401 });
    // a non-Bearer scheme or the literal 'undefined' never matches a real secret
    expect(decideCronAuth('Bearer undefined', 's3cret-value')).toMatchObject({ ok: false, status: 401 });
  });
});
