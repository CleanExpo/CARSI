/**
 * GP-732: the course checkout session records the visitor's analytics choice on its metadata,
 * where the Stripe webhook reads it before any server-side GA4 purchase event.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.create } } }),
}));

const { createStripeCheckoutForCourse } = await import('./local-course-checkout');

const course = { slug: 'example-course', title: 'Example', price_aud: 49, is_free: false };

function checkout(consent: 'granted' | 'denied' | 'unknown', extra?: Record<string, string>) {
  return createStripeCheckoutForCourse({
    slug: 'example-course',
    course: course as never,
    success_url: 'https://carsi.example.test/ok',
    cancel_url: 'https://carsi.example.test/cancel',
    extra_metadata: extra,
    analytics_consent: consent,
  });
}

beforeEach(() => {
  mocks.create.mockReset();
  mocks.create.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.example/cs_test_1' });
});

describe('createStripeCheckoutForCourse records the analytics choice', () => {
  it.each(['granted', 'denied', 'unknown'] as const)('%s', async (consent) => {
    await checkout(consent);
    expect(mocks.create.mock.calls[0][0].metadata.analytics_consent).toBe(consent);
  });

  it('extra metadata (cookie-derived) cannot overwrite a refusal', async () => {
    await checkout('denied', { analytics_consent: 'granted' });
    expect(mocks.create.mock.calls[0][0].metadata.analytics_consent).toBe('denied');
  });
});
