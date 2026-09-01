import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  decideMembershipCheckout,
  membershipCheckoutDecisionFor,
} from './membership-checkout-guard';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { lmsSubscription: { findUnique: mocks.findUnique } },
}));

const NOW = new Date('2026-08-24T00:00:00.000Z');

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  mocks.findUnique.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('decideMembershipCheckout — a live membership blocks a second checkout', () => {
  it.each([
    ['active', 'active'],
    ['trialing', 'trialing'],
  ])('blocks a %s membership', (_label, status) => {
    expect(decideMembershipCheckout({ subscription: { status, currentPeriodEnd: null }, lookupFailed: false }, NOW)).toEqual(
      { allowed: false, block: 'already_subscribed' },
    );
  });

  it('blocks a past_due membership still inside its grace window', () => {
    // Period ended yesterday; grace is 7 days, so this is still a live membership.
    const currentPeriodEnd = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    expect(
      decideMembershipCheckout({ subscription: { status: 'past_due', currentPeriodEnd }, lookupFailed: false }, NOW),
    ).toEqual({ allowed: false, block: 'already_subscribed' });
  });
});

describe('decideMembershipCheckout — states a learner may buy their way out of', () => {
  it('allows a learner with no subscription row at all', () => {
    expect(decideMembershipCheckout({ subscription: null, lookupFailed: false }, NOW)).toEqual({
      allowed: true,
    });
  });

  it.each(['canceled', 'unpaid', 'incomplete_expired'])('allows a %s membership', (status) => {
    expect(
      decideMembershipCheckout({ subscription: { status, currentPeriodEnd: null }, lookupFailed: false }, NOW),
    ).toEqual({ allowed: true });
  });

  it('allows an abandoned `incomplete` checkout to be retried', () => {
    // `incomplete` means an earlier checkout was never paid. Blocking here would
    // strand the learner: no live membership, and no way to start another.
    expect(
      decideMembershipCheckout(
        { subscription: { status: 'incomplete', currentPeriodEnd: null }, lookupFailed: false },
        NOW,
      ),
    ).toEqual({ allowed: true });
  });

  it('allows a past_due membership beyond its grace window', () => {
    const currentPeriodEnd = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(
      decideMembershipCheckout({ subscription: { status: 'past_due', currentPeriodEnd }, lookupFailed: false }, NOW),
    ).toEqual({ allowed: true });
  });
});

describe('decideMembershipCheckout — fails closed, not open', () => {
  it('blocks when the lookup failed, even though the subscription reads as absent', () => {
    // The whole point of the separate flag: Prisma returns null both for "no row"
    // and for a query we never got to run. Those are opposite answers here.
    expect(decideMembershipCheckout({ subscription: null, lookupFailed: true }, NOW)).toEqual({
      allowed: false,
      block: 'indeterminate',
    });
  });
});

describe('membershipCheckoutDecisionFor — the data wrapper', () => {
  it('allows a learner Prisma reports as having no subscription', async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(membershipCheckoutDecisionFor('user-1', NOW)).resolves.toEqual({ allowed: true });
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { status: true, currentPeriodEnd: true },
    });
  });

  it('blocks a learner Prisma reports as active', async () => {
    mocks.findUnique.mockResolvedValue({ status: 'active', currentPeriodEnd: null });
    await expect(membershipCheckoutDecisionFor('user-1', NOW)).resolves.toEqual({
      allowed: false,
      block: 'already_subscribed',
    });
  });

  it('blocks when the lookup throws — an unreachable database opens no checkout', async () => {
    mocks.findUnique.mockRejectedValue(new Error('connection refused'));
    await expect(membershipCheckoutDecisionFor('user-1', NOW)).resolves.toEqual({
      allowed: false,
      block: 'indeterminate',
    });
  });

  it('blocks when DATABASE_URL is unset, without attempting a lookup', async () => {
    delete process.env.DATABASE_URL;
    await expect(membershipCheckoutDecisionFor('user-1', NOW)).resolves.toEqual({
      allowed: false,
      block: 'indeterminate',
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty user id', ''],
    ['a whitespace user id', '   '],
  ])('blocks on %s, without attempting a lookup', async (_label, userId) => {
    await expect(membershipCheckoutDecisionFor(userId, NOW)).resolves.toEqual({
      allowed: false,
      block: 'indeterminate',
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('keeps the learner id out of the log line when the lookup fails (CWE-532)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.findUnique.mockRejectedValue(new Error('connection refused'));
    await membershipCheckoutDecisionFor('user-secret-id', NOW);
    const logged = spy.mock.calls.flat().map(String).join(' ');
    expect(logged).not.toContain('user-secret-id');
  });
});
