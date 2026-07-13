import { describe, expect, it, vi } from 'vitest';

import { confirmEmailOwnershipOk, resolveAccountEmail } from './enrollment-confirm-guard';

/**
 * WS5 — enrollments/confirm payer-email ownership. FAIL CLOSED: both the Stripe
 * payer email and the account email must be present AND equal. The bug was that
 * the check only ran when BOTH were truthy, so a JWT with no email claim (or a
 * session with no email) skipped it and could finalise someone else's payment.
 */
describe('confirmEmailOwnershipOk', () => {
  it('passes only when both emails are present and equal (case/space-insensitive)', () => {
    expect(confirmEmailOwnershipOk('buyer@example.com', 'buyer@example.com')).toBe(true);
    expect(confirmEmailOwnershipOk('  Buyer@Example.com ', 'buyer@example.com')).toBe(true);
  });

  it('fails a mismatch', () => {
    expect(confirmEmailOwnershipOk('attacker@example.com', 'victim@example.com')).toBe(false);
  });

  it('FAILS CLOSED when either side is missing (the core bug)', () => {
    expect(confirmEmailOwnershipOk('buyer@example.com', null)).toBe(false);
    expect(confirmEmailOwnershipOk('buyer@example.com', '')).toBe(false);
    expect(confirmEmailOwnershipOk('buyer@example.com', undefined)).toBe(false);
    expect(confirmEmailOwnershipOk(null, 'buyer@example.com')).toBe(false);
    expect(confirmEmailOwnershipOk('', '')).toBe(false);
    expect(confirmEmailOwnershipOk('   ', 'buyer@example.com')).toBe(false);
  });
});

describe('resolveAccountEmail', () => {
  it('prefers the JWT email claim without hitting the DB', async () => {
    const lookup = vi.fn(async () => 'db@example.com');
    expect(await resolveAccountEmail('claim@example.com', lookup)).toBe('claim@example.com');
    expect(lookup).not.toHaveBeenCalled();
  });

  it('falls back to the DB email when the claim is absent/blank', async () => {
    expect(await resolveAccountEmail(undefined, async () => 'db@example.com')).toBe('db@example.com');
    expect(await resolveAccountEmail('  ', async () => 'db@example.com')).toBe('db@example.com');
  });

  it('returns null when neither the claim nor the DB has an email (never falls to the session email)', async () => {
    expect(await resolveAccountEmail(null, async () => null)).toBeNull();
    expect(await resolveAccountEmail('', async () => undefined)).toBeNull();
  });
});
