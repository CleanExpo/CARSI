import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CHECKOUT_RESERVATION_STATUS,
  CHECKOUT_RESERVATION_TTL_MS,
  CHECKOUT_SESSION_TTL_MS,
  checkoutSessionExpiresAt,
  releaseMembershipCheckout,
  reserveMembershipCheckout,
} from './membership-checkout-reservation';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsSubscription: {
      create: mocks.create,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
  },
}));

const NOW = new Date('2026-08-24T12:00:00.000Z');

/** What Prisma throws when the unique `userId` already has a row. */
function uniqueViolation() {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  mocks.create.mockReset().mockResolvedValue({});
  mocks.updateMany.mockReset().mockResolvedValue({ count: 0 });
  mocks.deleteMany.mockReset().mockResolvedValue({ count: 0 });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('the reservation window outlives the session it protects', () => {
  it('keeps the reservation TTL strictly longer than the session TTL', () => {
    // If this ever inverts, a stale reservation could be taken over while the
    // first learner's Checkout Session was still payable — two payable sessions,
    // which is the whole thing this module prevents.
    expect(CHECKOUT_RESERVATION_TTL_MS).toBeGreaterThan(CHECKOUT_SESSION_TTL_MS);
  });

  it('gives Stripe an epoch-seconds expiry inside its 30-minute-to-24-hour window', () => {
    const expiresAt = checkoutSessionExpiresAt(NOW);
    const secondsOut = expiresAt - Math.floor(NOW.getTime() / 1000);

    expect(Number.isInteger(expiresAt)).toBe(true);
    expect(secondsOut).toBeGreaterThan(30 * 60);
    expect(secondsOut).toBeLessThanOrEqual(24 * 60 * 60);
  });
});

describe('reserveMembershipCheckout', () => {
  it('claims the checkout by inserting the reservation row', async () => {
    await expect(reserveMembershipCheckout('user-1', NOW)).resolves.toBe('reserved');
    expect(mocks.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', status: CHECKOUT_RESERVATION_STATUS },
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('refuses when another request already holds a fresh reservation', async () => {
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(reserveMembershipCheckout('user-1', NOW)).resolves.toBe('busy');
  });

  it('refuses when the existing row is a real membership, not a reservation', async () => {
    // The takeover is scoped to `status: checkout_pending`, so an `active` row
    // matches nothing and the caller is turned away rather than stealing it.
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(reserveMembershipCheckout('user-1', NOW)).resolves.toBe('busy');
    expect(mocks.updateMany.mock.calls[0][0].where.status).toBe(CHECKOUT_RESERVATION_STATUS);
  });

  it('takes over a reservation that has passed its TTL', async () => {
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 1 });

    await expect(reserveMembershipCheckout('user-1', NOW)).resolves.toBe('reserved');

    const where = mocks.updateMany.mock.calls[0][0].where;
    expect(where.userId).toBe('user-1');
    // Only rows last touched before now-minus-TTL are stealable.
    expect(where.updatedAt.lt).toEqual(new Date(NOW.getTime() - CHECKOUT_RESERVATION_TTL_MS));
  });

  it('restamps the row on takeover so the next caller has to wait again', async () => {
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 1 });

    await reserveMembershipCheckout('user-1', NOW);

    // An empty `data` would leave `updatedAt` untouched and let every subsequent
    // racer take the same stale reservation.
    expect(mocks.updateMany.mock.calls[0][0].data).toEqual({
      status: CHECKOUT_RESERVATION_STATUS,
      statusEventAt: null,
    });
  });

  it('fails closed when the insert throws something other than a unique violation', async () => {
    mocks.create.mockRejectedValue(new Error('connection refused'));

    await expect(reserveMembershipCheckout('user-1', NOW)).resolves.toBe('unavailable');
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('fails closed when the takeover query throws', async () => {
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockRejectedValue(new Error('connection refused'));

    await expect(reserveMembershipCheckout('user-1', NOW)).resolves.toBe('unavailable');
  });

  it.each([
    ['no DATABASE_URL', () => delete process.env.DATABASE_URL],
    ['a blank user id', () => {}],
  ])('fails closed on %s without touching the database', async (label, mutate) => {
    mutate();
    const userId = label === 'a blank user id' ? '   ' : 'user-1';

    await expect(reserveMembershipCheckout(userId, NOW)).resolves.toBe('unavailable');
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe('releaseMembershipCheckout', () => {
  it('deletes only rows still marked as a reservation', async () => {
    await releaseMembershipCheckout('user-1');

    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: CHECKOUT_RESERVATION_STATUS },
    });
  });

  it('never throws when the delete fails — the TTL still bounds it', async () => {
    mocks.deleteMany.mockRejectedValue(new Error('connection refused'));

    await expect(releaseMembershipCheckout('user-1')).resolves.toBeUndefined();
  });
});
