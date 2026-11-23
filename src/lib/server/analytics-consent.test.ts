/**
 * GP-732: the server-side GA4 events follow the visitor's analytics choice, carried from the
 * browser through the Stripe session and subscription metadata. Fail closed: only a recorded yes
 * under the current notice version sends anything.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_NOTICE_VERSION } from '@/lib/analytics/consent';

import {
  analyticsConsentFromBody,
  analyticsConsentMetadata,
  hasAnalyticsConsent,
} from './analytics-consent';
import { trackSubscriptionLifecycleEvent } from './subscription-analytics';

const ENV_KEYS = ['NEXT_PUBLIC_GA_MEASUREMENT_ID', 'GA4_MEASUREMENT_PROTOCOL_API_SECRET'] as const;
const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
const originalFetch = global.fetch;

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('reading the choice from a checkout request', () => {
  it('is a yes only for the exact string the browser sends for a stored yes', () => {
    expect(analyticsConsentFromBody('granted')).toBe(true);
    for (const value of ['denied', 'unset', 'GRANTED', ' granted', true, 1, null, undefined, {}]) {
      expect(analyticsConsentFromBody(value)).toBe(false);
    }
  });

  it('records a yes or a no with the notice version', () => {
    expect(analyticsConsentMetadata(true)).toEqual({
      analytics_consent: 'granted',
      analytics_consent_version: CONSENT_NOTICE_VERSION,
    });
    expect(analyticsConsentMetadata(false)).toEqual({
      analytics_consent: 'denied',
      analytics_consent_version: CONSENT_NOTICE_VERSION,
    });
  });
});

describe('reading the choice back from Stripe metadata', () => {
  it('is a yes only for a recorded yes under the current notice version', () => {
    expect(hasAnalyticsConsent(analyticsConsentMetadata(true))).toBe(true);
    expect(hasAnalyticsConsent(analyticsConsentMetadata(false))).toBe(false);
    expect(hasAnalyticsConsent({ analytics_consent: 'granted' })).toBe(false);
    expect(
      hasAnalyticsConsent({ analytics_consent: 'granted', analytics_consent_version: '0-old' })
    ).toBe(false);
    expect(hasAnalyticsConsent({})).toBe(false);
    expect(hasAnalyticsConsent(null)).toBe(false);
    expect(hasAnalyticsConsent(undefined)).toBe(false);
  });
});

describe('the subscription events', () => {
  function configured() {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
    process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET = 'secret-abc';
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchImpl as unknown as typeof fetch;
    return fetchImpl;
  }

  it.each([
    ['a subscription opened before the choice was recorded', { plan: 'pro_annual' }],
    ['a no', { plan: 'pro_annual', ...analyticsConsentMetadata(false) }],
    ['no metadata at all', undefined],
  ])('sends nothing for %s', async (_label, metadata) => {
    const fetchImpl = configured();
    await trackSubscriptionLifecycleEvent({
      event: 'subscription_renewed',
      plan: 'pro_annual',
      subscriptionId: 'sub_test_1',
      metadata,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends after a yes, keyed on the subscription and never on the learner', async () => {
    const fetchImpl = configured();
    await trackSubscriptionLifecycleEvent({
      event: 'subscription_started',
      plan: 'pro_annual',
      subscriptionId: 'sub_test_1',
      metadata: { carsi_user_id: 'learner-1', ...analyticsConsentMetadata(true) },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.client_id).toBe('sub_test_1');
    expect(body).not.toHaveProperty('user_id');
    expect(JSON.stringify(body)).not.toContain('learner-1');
    expect(body.events[0].name).toBe('subscription_started');
  });
});
