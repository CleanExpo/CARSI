/**
 * GP-732: the visitor's analytics choice travels request cookie -> Stripe metadata -> webhook,
 * and the server-side GA4 send happens only on a recorded `granted`. Refused and unknown both
 * send nothing (fail closed).
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendGa4PurchaseEvent } from '@/lib/server/ga4-measurement-protocol';
import { trackSubscriptionLifecycleEvent } from '@/lib/server/subscription-analytics';

import {
  ANALYTICS_CONSENT_COOKIE,
  analyticsConsentFromMetadata,
  analyticsConsentMetadata,
  parseAnalyticsConsent,
  readAnalyticsConsent,
} from './analytics-consent';

function checkoutRequest(cookie?: string): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/checkout', {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  });
}

/** The metadata a checkout route writes for this request, as the webhook later reads it. */
function metadataAfterCheckout(cookie?: string): Record<string, string> {
  return { course_slug: 'example-course', ...analyticsConsentMetadata(readAnalyticsConsent(checkoutRequest(cookie))) };
}

const fetchMock = vi.fn();
const originalFetch = global.fetch;

beforeEach(() => {
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
  process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET = 'synthetic-secret';
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 204 });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  delete process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET;
  global.fetch = originalFetch;
});

describe('parseAnalyticsConsent', () => {
  it('accepts only the exact values granted and denied', () => {
    expect(parseAnalyticsConsent('granted')).toBe('granted');
    expect(parseAnalyticsConsent('denied')).toBe('denied');
    for (const raw of [undefined, null, '', 'GRANTED', ' granted', 'yes', 'true', '1', 42, {}]) {
      expect(parseAnalyticsConsent(raw)).toBe('unknown');
    }
  });

  it('reads an absent metadata bag as unknown', () => {
    expect(analyticsConsentFromMetadata(undefined)).toBe('unknown');
    expect(analyticsConsentFromMetadata(null)).toBe('unknown');
    expect(analyticsConsentFromMetadata({})).toBe('unknown');
  });
});

describe('purchase: cookie at checkout -> metadata -> webhook send', () => {
  async function purchaseWith(cookie?: string) {
    return sendGa4PurchaseEvent({
      clientId: 'cs_test_synthetic',
      courseSlug: 'example-course',
      valueAud: 49,
      transactionId: 'cs_test_synthetic',
      consent: analyticsConsentFromMetadata(metadataAfterCheckout(cookie)),
    });
  }

  it('granted: the purchase event is sent', async () => {
    const result = await purchaseWith(`${ANALYTICS_CONSENT_COOKIE}=granted`);
    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refused: nothing is sent', async () => {
    const result = await purchaseWith(`${ANALYTICS_CONSENT_COOKIE}=denied`);
    expect(result).toEqual({ sent: false, skipped: 'no-consent' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('unknown (no cookie): nothing is sent', async () => {
    const result = await purchaseWith();
    expect(result).toEqual({ sent: false, skipped: 'no-consent' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('unknown (session created before consent was recorded, no metadata key): nothing is sent', async () => {
    const result = await sendGa4PurchaseEvent({
      clientId: 'cs_test_old',
      courseSlug: 'example-course',
      valueAud: 49,
      transactionId: 'cs_test_old',
      consent: analyticsConsentFromMetadata({ course_slug: 'example-course' }),
    });
    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('subscription lifecycle: choice stored on the subscription metadata', () => {
  it.each([
    ['granted', `${ANALYTICS_CONSENT_COOKIE}=granted`, 1],
    ['refused', `${ANALYTICS_CONSENT_COOKIE}=denied`, 0],
    ['unknown', undefined, 0],
  ])('%s', async (_label, cookie, calls) => {
    await trackSubscriptionLifecycleEvent({
      event: 'subscription_renewed',
      plan: 'pro_annual',
      subscriptionId: 'sub_synthetic',
      consent: analyticsConsentFromMetadata(metadataAfterCheckout(cookie)),
    });
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });
});
