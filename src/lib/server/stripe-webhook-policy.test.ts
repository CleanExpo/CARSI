import { describe, expect, it } from 'vitest';

import { shouldRetryWebhookFulfillment } from './stripe-webhook-policy';

describe('shouldRetryWebhookFulfillment', () => {
  it('does NOT retry a terminal business condition (user already on a team)', () => {
    expect(shouldRetryWebhookFulfillment('ALREADY_ON_TEAM')).toBe(false);
  });

  it('retries an unexpected/transient error so a paid enrolment is not lost', () => {
    expect(shouldRetryWebhookFulfillment('Can\'t reach database server')).toBe(true);
  });

  it('retries on an empty/unknown error message', () => {
    expect(shouldRetryWebhookFulfillment('')).toBe(true);
  });
});
