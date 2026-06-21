import { describe, expect, it } from 'vitest';

import { resolveStripePaymentReference } from './stripe-payment-reference';

describe('resolveStripePaymentReference', () => {
  it('returns the trimmed Stripe session id', () => {
    expect(resolveStripePaymentReference('cs_test_123')).toBe('cs_test_123');
    expect(resolveStripePaymentReference('  cs_test_123  ')).toBe('cs_test_123');
  });

  it('returns null for a missing / blank / non-string id (never a shared literal)', () => {
    expect(resolveStripePaymentReference('')).toBeNull();
    expect(resolveStripePaymentReference('   ')).toBeNull();
    expect(resolveStripePaymentReference(undefined)).toBeNull();
    expect(resolveStripePaymentReference(null)).toBeNull();
    expect(resolveStripePaymentReference(123)).toBeNull();
  });
});
