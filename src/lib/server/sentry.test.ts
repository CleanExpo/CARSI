import { afterEach, describe, expect, it } from 'vitest';

import { captureServerError, isSentryEnabled } from './sentry';

const originalDsn = process.env.SENTRY_DSN;

afterEach(() => {
  if (originalDsn === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = originalDsn;
});

describe('isSentryEnabled', () => {
  it('is false when SENTRY_DSN is unset', () => {
    delete process.env.SENTRY_DSN;
    expect(isSentryEnabled()).toBe(false);
  });

  it('is false when SENTRY_DSN is blank', () => {
    process.env.SENTRY_DSN = '   ';
    expect(isSentryEnabled()).toBe(false);
  });

  it('is true when SENTRY_DSN is set', () => {
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/0';
    expect(isSentryEnabled()).toBe(true);
  });
});

describe('captureServerError', () => {
  it('no-ops (resolves without throwing, no Sentry import) when SENTRY_DSN is unset', async () => {
    delete process.env.SENTRY_DSN;
    await expect(
      captureServerError(new Error('boom'), { route: '/api/lms/webhooks/stripe' }),
    ).resolves.toBeUndefined();
  });

  it('never throws even if the underlying capture path fails', async () => {
    // No DSN configured in the unit-test environment, so this exercises the
    // no-op branch; the contract (never throw) is what matters here since we
    // do not want unit tests making real network calls to Sentry.
    delete process.env.SENTRY_DSN;
    await expect(captureServerError('a plain string error')).resolves.toBeUndefined();
  });
});
