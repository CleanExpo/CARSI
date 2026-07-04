import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';

import {
  readCancelAtPeriodEnd,
  readCurrentPeriodEnd,
  readCustomerId,
  readInvoiceEmail,
  readInvoiceSubscriptionId,
} from './stripe-subscription-map';

// The 2026-02-25.clover API version moved current_period_end onto items and the
// invoice→subscription link under parent.subscription_details. These tests pin
// both the current shape and the legacy fallback so a lapse is never mis-dated.

const SEC = 1_760_000_000; // arbitrary unix seconds

function sub(overrides: Record<string, unknown>): Stripe.Subscription {
  return overrides as unknown as Stripe.Subscription;
}
function inv(overrides: Record<string, unknown>): Stripe.Invoice {
  return overrides as unknown as Stripe.Invoice;
}

describe('readCurrentPeriodEnd', () => {
  it('reads the item-level current_period_end (current SDK shape)', () => {
    const s = sub({ items: { data: [{ current_period_end: SEC }] } });
    expect(readCurrentPeriodEnd(s)).toEqual(new Date(SEC * 1000));
  });

  it('takes the LATEST item period end when items disagree', () => {
    const s = sub({
      items: { data: [{ current_period_end: SEC }, { current_period_end: SEC + 1000 }] },
    });
    expect(readCurrentPeriodEnd(s)).toEqual(new Date((SEC + 1000) * 1000));
  });

  it('falls back to the legacy top-level current_period_end', () => {
    const s = sub({ items: { data: [] }, current_period_end: SEC });
    expect(readCurrentPeriodEnd(s)).toEqual(new Date(SEC * 1000));
  });

  it('returns null when no period end is present anywhere', () => {
    expect(readCurrentPeriodEnd(sub({ items: { data: [] } }))).toBeNull();
  });
});

describe('readCancelAtPeriodEnd', () => {
  it('reads the flag', () => {
    expect(readCancelAtPeriodEnd(sub({ cancel_at_period_end: true }))).toBe(true);
    expect(readCancelAtPeriodEnd(sub({}))).toBe(false);
  });
});

describe('readCustomerId', () => {
  it('reads a string customer id', () => {
    expect(readCustomerId(sub({ customer: 'cus_123' }))).toBe('cus_123');
  });
  it('reads an expanded customer object id', () => {
    expect(readCustomerId(sub({ customer: { id: 'cus_456' } }))).toBe('cus_456');
  });
  it('returns null when absent', () => {
    expect(readCustomerId(sub({}))).toBeNull();
  });
});

describe('readInvoiceSubscriptionId', () => {
  it('reads parent.subscription_details.subscription (current shape)', () => {
    const i = inv({ parent: { subscription_details: { subscription: 'sub_1' } } });
    expect(readInvoiceSubscriptionId(i)).toBe('sub_1');
  });
  it('reads an expanded subscription object under parent', () => {
    const i = inv({ parent: { subscription_details: { subscription: { id: 'sub_2' } } } });
    expect(readInvoiceSubscriptionId(i)).toBe('sub_2');
  });
  it('falls back to the legacy top-level invoice.subscription', () => {
    expect(readInvoiceSubscriptionId(inv({ subscription: 'sub_3' }))).toBe('sub_3');
  });
  it('returns null for a one-off (non-subscription) invoice', () => {
    expect(readInvoiceSubscriptionId(inv({ parent: null }))).toBeNull();
  });
});

describe('readInvoiceEmail', () => {
  it('lower-cases and trims the customer email', () => {
    expect(readInvoiceEmail(inv({ customer_email: '  Person@Example.COM ' }))).toBe(
      'person@example.com',
    );
  });
  it('returns null when absent', () => {
    expect(readInvoiceEmail(inv({}))).toBeNull();
  });
});
