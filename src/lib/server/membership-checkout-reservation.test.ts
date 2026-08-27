import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CHECKOUT_RESERVATION_STATUS,
  CHECKOUT_RESERVATION_TTL_MS,
  CHECKOUT_SESSION_TTL_MS,
  checkoutSessionExpiresAt,
  releaseMembershipCheckout,
  releaseOrgCheckout,
  releaseTeamCheckout,
  reserveMembershipCheckout,
  reserveOrgCheckout,
  reserveTeamCheckout,
} from './membership-checkout-reservation';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  teamCreate: vi.fn(),
  teamUpdateMany: vi.fn(),
  teamDeleteMany: vi.fn(),
  orgCreate: vi.fn(),
  orgUpdateMany: vi.fn(),
  orgDeleteMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsSubscription: {
      create: mocks.create,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
    lmsTeamSubscription: {
      create: mocks.teamCreate,
      updateMany: mocks.teamUpdateMany,
      deleteMany: mocks.teamDeleteMany,
    },
    lmsOrgSubscription: {
      create: mocks.orgCreate,
      updateMany: mocks.orgUpdateMany,
      deleteMany: mocks.orgDeleteMany,
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
  mocks.teamCreate.mockReset().mockResolvedValue({});
  mocks.teamUpdateMany.mockReset().mockResolvedValue({ count: 0 });
  mocks.teamDeleteMany.mockReset().mockResolvedValue({ count: 0 });
  mocks.orgCreate.mockReset().mockResolvedValue({});
  mocks.orgUpdateMany.mockReset().mockResolvedValue({ count: 0 });
  mocks.orgDeleteMany.mockReset().mockResolvedValue({ count: 0 });
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
      data: { userId: 'user-1', status: CHECKOUT_RESERVATION_STATUS, statusEventAt: NOW },
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
    // The claimable set is an allow-list of provably-not-live states, so an
    // `active` row matches no branch and is never stolen.
    const branches = JSON.stringify(mocks.updateMany.mock.calls[0][0].where.OR);
    expect(branches).not.toContain('active');
  });

  it('takes over a reservation that has passed its TTL', async () => {
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 1 });

    await expect(reserveMembershipCheckout('user-1', NOW)).resolves.toBe('reserved');

    const where = mocks.updateMany.mock.calls[0][0].where;
    expect(where.userId).toBe('user-1');
    // A reservation is stealable only once it is older than the TTL.
    const reservationBranch = (where.OR as Array<{ status?: string; updatedAt?: { lt: Date } }>).find(
      (b) => b.status === CHECKOUT_RESERVATION_STATUS,
    );
    expect(reservationBranch?.updatedAt?.lt).toEqual(
      new Date(NOW.getTime() - CHECKOUT_RESERVATION_TTL_MS),
    );
  });

  it('restamps the row on takeover so the next caller has to wait again', async () => {
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 1 });

    await reserveMembershipCheckout('user-1', NOW);

    // An empty `data` would leave `updatedAt` untouched and let every subsequent
    // racer take the same stale reservation.
    expect(mocks.updateMany.mock.calls[0][0].data).toEqual({
      status: CHECKOUT_RESERVATION_STATUS,
      stripeSubscriptionId: null,
      statusEventAt: NOW,
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


/** Pull the OR branches the takeover offered as claimable. */
function claimableStatuses(call: unknown): unknown[] {
  const where = (call as { where: { OR: unknown[] } }).where;
  return where.OR;
}

describe('a payer whose subscription lapsed can buy again', () => {
  it('offers cancelled, unpaid, expired and abandoned rows as claimable', async () => {
    // Without this the takeover would only match a stale reservation, so anyone
    // with an old row would fail every insert, match no update, and be told a
    // checkout was already open — forever. The duplicate-membership guard lets
    // exactly these states through, so the reservation must agree with it.
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 1 });

    await expect(reserveMembershipCheckout('user-1', NOW)).resolves.toBe('reserved');

    const branches = JSON.stringify(claimableStatuses(mocks.updateMany.mock.calls[0][0]));
    for (const status of ['canceled', 'unpaid', 'incomplete_expired', 'incomplete']) {
      expect(branches).toContain(status);
    }
  });

  it('offers a past-due row only once it is beyond the grace window', async () => {
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 1 });

    await reserveMembershipCheckout('user-1', NOW);

    const branches = claimableStatuses(mocks.updateMany.mock.calls[0][0]) as Array<{
      status?: string;
      currentPeriodEnd?: unknown;
    }>;
    const pastDue = branches.filter((b) => b.status === 'past_due');
    // Both forms: unknown period end (unprovable, so lapsed) and beyond grace.
    expect(pastDue).toHaveLength(2);
    expect(pastDue.some((b) => b.currentPeriodEnd === null)).toBe(true);
  });

  it('never offers a live status as claimable', async () => {
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await reserveMembershipCheckout('user-1', NOW);

    // An allow-list, so `active`/`trialing` can never be stolen — and an
    // unrecognised or oddly-cased status is left alone rather than claimed.
    const branches = JSON.stringify(claimableStatuses(mocks.updateMany.mock.calls[0][0]));
    expect(branches).not.toContain('active');
    expect(branches).not.toContain('trialing');
  });
});

describe('reserveTeamCheckout', () => {
  it('claims the team checkout with zero seats until Stripe confirms', async () => {
    await expect(reserveTeamCheckout('team-1', NOW)).resolves.toBe('reserved');

    expect(mocks.teamCreate).toHaveBeenCalledWith({
      data: {
        teamId: 'team-1',
        status: CHECKOUT_RESERVATION_STATUS,
        seatLimit: 0,
        statusEventAt: NOW,
      },
    });
  });

  it('refuses when a live team subscription or fresh reservation holds the row', async () => {
    mocks.teamCreate.mockRejectedValue(uniqueViolation());
    mocks.teamUpdateMany.mockResolvedValue({ count: 0 });

    await expect(reserveTeamCheckout('team-1', NOW)).resolves.toBe('busy');
  });

  it('never hands out seats on takeover either', async () => {
    mocks.teamCreate.mockRejectedValue(uniqueViolation());
    mocks.teamUpdateMany.mockResolvedValue({ count: 1 });

    await expect(reserveTeamCheckout('team-1', NOW)).resolves.toBe('reserved');
    expect(mocks.teamUpdateMany.mock.calls[0][0].data.seatLimit).toBe(0);
  });

  it('fails closed when the database throws', async () => {
    mocks.teamCreate.mockRejectedValue(new Error('connection refused'));

    await expect(reserveTeamCheckout('team-1', NOW)).resolves.toBe('unavailable');
  });

  it('releases only reservation rows', async () => {
    await releaseTeamCheckout('team-1');

    expect(mocks.teamDeleteMany).toHaveBeenCalledWith({
      where: { teamId: 'team-1', status: CHECKOUT_RESERVATION_STATUS },
    });
  });
});

describe('reserveOrgCheckout', () => {
  const params = {
    teamId: 'team-1',
    organisationName: 'Acme Restoration Pty Ltd',
    contactEmail: '  Owner@Example.Test ',
  };

  it('claims the org checkout, normalising the contact email', async () => {
    await expect(reserveOrgCheckout(params, NOW)).resolves.toBe('reserved');

    const data = mocks.orgCreate.mock.calls[0][0].data;
    expect(data.teamId).toBe('team-1');
    expect(data.status).toBe(CHECKOUT_RESERVATION_STATUS);
    expect(data.contactEmail).toBe('owner@example.test');
    expect(data.seatModel).toBe('unlimited');
  });

  it('refuses a second org checkout for the same container', async () => {
    mocks.orgCreate.mockRejectedValue(uniqueViolation());
    mocks.orgUpdateMany.mockResolvedValue({ count: 0 });

    await expect(reserveOrgCheckout(params, NOW)).resolves.toBe('busy');
  });

  it('refreshes the organisation details when taking over a claimable row', async () => {
    mocks.orgCreate.mockRejectedValue(uniqueViolation());
    mocks.orgUpdateMany.mockResolvedValue({ count: 1 });

    await expect(reserveOrgCheckout(params, NOW)).resolves.toBe('reserved');
    expect(mocks.orgUpdateMany.mock.calls[0][0].data.organisationName).toBe(
      'Acme Restoration Pty Ltd',
    );
  });

  it('fails closed when the database throws', async () => {
    mocks.orgCreate.mockRejectedValue(new Error('connection refused'));

    await expect(reserveOrgCheckout(params, NOW)).resolves.toBe('unavailable');
  });

  it('releases only reservation rows', async () => {
    await releaseOrgCheckout('team-1');

    expect(mocks.orgDeleteMany).toHaveBeenCalledWith({
      where: { teamId: 'team-1', status: CHECKOUT_RESERVATION_STATUS },
    });
  });
});


describe('a takeover detaches the row from the subscription it used to describe', () => {
  it.each([
    ['individual', () => reserveMembershipCheckout('user-1', NOW), () => mocks.updateMany],
    ['team', () => reserveTeamCheckout('team-1', NOW), () => mocks.teamUpdateMany],
    [
      'org',
      () =>
        reserveOrgCheckout(
          { teamId: 'team-1', organisationName: 'Acme', contactEmail: 'o@example.test' },
          NOW,
        ),
      () => mocks.orgUpdateMany,
    ],
  ])('nulls the old stripeSubscriptionId on the %s path', async (_label, run, updater) => {
    // `markSubscriptionStatusBySubscriptionId` updates by stripeSubscriptionId
    // with no status filter and no ordering guard, so leaving the old id on the
    // row lets ANY late event for the old subscription overwrite the claim —
    // dropping the reservation and reopening the duplicate checkout.
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.teamCreate.mockRejectedValue(uniqueViolation());
    mocks.orgCreate.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.teamUpdateMany.mockResolvedValue({ count: 1 });
    mocks.orgUpdateMany.mockResolvedValue({ count: 1 });

    await run();

    expect(updater().mock.calls[0][0].data.stripeSubscriptionId).toBeNull();
  });

  it.each([
    ['individual', () => reserveMembershipCheckout('user-1', NOW), () => mocks.updateMany],
    ['team', () => reserveTeamCheckout('team-1', NOW), () => mocks.teamUpdateMany],
    [
      'org',
      () =>
        reserveOrgCheckout(
          { teamId: 'team-1', organisationName: 'Acme', contactEmail: 'o@example.test' },
          NOW,
        ),
      () => mocks.orgUpdateMany,
    ],
  ])('stamps statusEventAt so older events lose, on the %s path', async (_label, run, updater) => {
    // `null` here would mean "always overwritable" — the right posture for a
    // webhook write, the wrong one for a claim that must survive checkout.
    mocks.create.mockRejectedValue(uniqueViolation());
    mocks.teamCreate.mockRejectedValue(uniqueViolation());
    mocks.orgCreate.mockRejectedValue(uniqueViolation());
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.teamUpdateMany.mockResolvedValue({ count: 1 });
    mocks.orgUpdateMany.mockResolvedValue({ count: 1 });

    await run();

    expect(updater().mock.calls[0][0].data.statusEventAt).toEqual(NOW);
  });

  it('stamps statusEventAt on a fresh insert too', async () => {
    await reserveMembershipCheckout('user-1', NOW);

    expect(mocks.create.mock.calls[0][0].data.statusEventAt).toEqual(NOW);
  });
});
