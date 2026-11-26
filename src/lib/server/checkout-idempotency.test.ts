import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';

import {
  checkoutSessionIdempotencyKey,
  COURSE_CHECKOUT_REPEAT_WINDOW_MS,
  courseCheckoutIdempotencyKey,
  createKeyedCheckoutSession,
  type CheckoutIdempotencyKey,
} from '@/lib/server/checkout-idempotency';
import { PURCHASE_SURVEY_BINDING_METADATA_KEY } from '@/lib/server/purchase-survey-token';

/**
 * GP-789: the guard is a run-time check on the real create, not a scan of the source. These
 * tests call the checked create the way a route does and plant each bad key a scan could miss:
 * a hand-made key, a key for another request, a key replaced by a spread, a shadowed builder.
 */

type Create = (
  params: Stripe.Checkout.SessionCreateParams,
  options?: Stripe.RequestOptions
) => Promise<Stripe.Checkout.Session>;

function fakeStripe() {
  const create = vi.fn<Create>(async () => ({ id: 'cs_test_1' }) as Stripe.Checkout.Session);
  return {
    stripe: { checkout: { sessions: { create } } } as unknown as Pick<Stripe, 'checkout'>,
    create,
  };
}

const REQUEST: Stripe.Checkout.SessionCreateParams = {
  mode: 'payment',
  metadata: { course_slug: 'water', [PURCHASE_SURVEY_BINDING_METADATA_KEY]: 'a'.repeat(32) },
  line_items: [{ quantity: 1, price_data: { currency: 'aud', unit_amount: 29900 } }],
};

describe('createKeyedCheckoutSession: a run-time check on the key', () => {
  it('control: the owner key for this request is sent, and nothing else can replace it', async () => {
    const { stripe, create } = fakeStripe();
    const key = courseCheckoutIdempotencyKey(REQUEST);
    await createKeyedCheckoutSession(stripe, REQUEST, key, {
      maxNetworkRetries: 4,
      // A caller trying to swap the key through the options: the owner's key still wins.
      ...({ idempotencyKey: 'hand' } as object),
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][1]).toEqual({ maxNetworkRetries: 4, idempotencyKey: key });
  });

  it('refuses a hand-made key before any request is made', async () => {
    const { stripe, create } = fakeStripe();
    await expect(
      createKeyedCheckoutSession(stripe, REQUEST, 'hand' as CheckoutIdempotencyKey)
    ).rejects.toThrow('CHECKOUT_KEY_NOT_FROM_OWNER');
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a shadowed builder that returns a made-up key', async () => {
    const { stripe, create } = fakeStripe();
    const courseCheckoutIdempotencyKeyShadow = (): CheckoutIdempotencyKey =>
      'carsi:course:hand' as CheckoutIdempotencyKey;
    await expect(
      createKeyedCheckoutSession(stripe, REQUEST, courseCheckoutIdempotencyKeyShadow())
    ).rejects.toThrow('CHECKOUT_KEY_NOT_FROM_OWNER');
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a course key issued for a different request', async () => {
    const { stripe, create } = fakeStripe();
    const other: Stripe.Checkout.SessionCreateParams = {
      ...REQUEST,
      success_url: 'https://x.test/',
    };
    const keyForOther = courseCheckoutIdempotencyKey(other);
    await expect(createKeyedCheckoutSession(stripe, REQUEST, keyForOther)).rejects.toThrow(
      'CHECKOUT_KEY_FOR_OTHER_REQUEST'
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts a reservation key, which protects no single request body', async () => {
    const { stripe, create } = fakeStripe();
    const key = checkoutSessionIdempotencyKey('team', 'owner-1', new Date(1_000));
    await createKeyedCheckoutSession(stripe, REQUEST, key);
    expect(create.mock.calls[0][1]).toEqual({ idempotencyKey: key });
  });
});

describe('courseCheckoutIdempotencyKey: no clock inside a survey-bound repeat window', () => {
  const edge =
    Math.floor(Date.UTC(2026, 10, 25, 8, 10, 0) / COURSE_CHECKOUT_REPEAT_WINDOW_MS) *
    COURSE_CHECKOUT_REPEAT_WINDOW_MS;

  it('a survey-bound request gets the same key just before and just after a window edge', () => {
    const before = courseCheckoutIdempotencyKey(REQUEST, new Date(edge - 1000));
    const after = courseCheckoutIdempotencyKey(REQUEST, new Date(edge + 1000));
    expect(after).toBe(before);
  });

  it('a different survey binding is a different key', () => {
    const other: Stripe.Checkout.SessionCreateParams = {
      ...REQUEST,
      metadata: { ...REQUEST.metadata, [PURCHASE_SURVEY_BINDING_METADATA_KEY]: 'b'.repeat(32) },
    };
    expect(courseCheckoutIdempotencyKey(other)).not.toBe(courseCheckoutIdempotencyKey(REQUEST));
  });

  it('a request with no binding still falls back to the wall-clock window (named limit)', () => {
    const anonymous: Stripe.Checkout.SessionCreateParams = {
      ...REQUEST,
      metadata: { course_slug: 'water' },
    };
    const before = courseCheckoutIdempotencyKey(anonymous, new Date(edge - 1000));
    const same = courseCheckoutIdempotencyKey(anonymous, new Date(edge - 2000));
    const after = courseCheckoutIdempotencyKey(anonymous, new Date(edge + 1000));
    expect(same).toBe(before);
    expect(after).not.toBe(before);
  });
});
