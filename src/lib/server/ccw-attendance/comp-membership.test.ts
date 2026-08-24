import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CcwAttendeeOffer } from '@/lib/marketing/ccw-roadshow-offers';

import {
  attendeeMembershipRateAud,
  compAttendeeMembership,
  decideCompMembership,
} from './comp-membership';

const mocks = vi.hoisted(() => ({
  findSignIn: vi.fn(),
  findSubscription: vi.fn(),
  findUser: vi.fn(),
  claimComp: vi.fn(),
  grant: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ccwRoadshowSignIn: { findUnique: mocks.findSignIn, updateMany: mocks.claimComp },
    lmsSubscription: { findUnique: mocks.findSubscription },
    lmsUser: { findUnique: mocks.findUser },
  },
}));

vi.mock('@/lib/admin/admin-yearly-membership', () => ({
  grantYearlyMembership: mocks.grant,
}));

const NOW = new Date('2026-08-24T14:30:00.000Z');

/** An attendee who satisfies `baseOfferEligible`: both days, opted in, provisioned. */
function eligibleSignIn(overrides: Record<string, unknown> = {}) {
  return {
    email: 'attendee@example.test',
    fullName: 'Sam Attendee',
    studentId: 'user-1',
    enrollmentId: 'enrol-1',
    provisionStatus: 'provisioned',
    emailOptIn: true,
    day1CheckedInAt: new Date('2026-07-22T00:00:00.000Z'),
    day2CheckedInAt: new Date('2026-07-23T00:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  mocks.findSignIn.mockReset().mockResolvedValue(eligibleSignIn());
  mocks.findSubscription.mockReset().mockResolvedValue(null);
  mocks.findUser.mockReset().mockResolvedValue({ id: 'user-1' });
  // count 1 = this call won the claim.
  mocks.claimComp.mockReset().mockResolvedValue({ count: 1 });
  mocks.grant.mockReset().mockResolvedValue({ userId: 'user-1', email: 'attendee@example.test' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('attendeeMembershipRateAud', () => {
  it('reads the rate from the shipped offer config', () => {
    // Sourced, not restated — the same figure the self-serve coupon is sized
    // against, so the two cannot drift apart.
    expect(attendeeMembershipRateAud()).toBe(295);
  });

  it('returns null when the offer carries no rate', () => {
    const offers: CcwAttendeeOffer[] = [
      { key: 'carsi-membership', label: 'x', detail: 'x', live: false },
    ];

    expect(attendeeMembershipRateAud(offers)).toBeNull();
  });
});

describe('decideCompMembership — refusing beats guessing', () => {
  it('allows the comp when the attendee holds no subscription', () => {
    expect(decideCompMembership({ subscription: null, lookupFailed: false })).toEqual({
      allowed: true,
    });
  });

  it.each(['active', 'trialing'])('refuses when the attendee is already a %s member', (status) => {
    expect(
      decideCompMembership({
        subscription: { status, currentPeriodEnd: null },
        lookupFailed: false,
      }),
    ).toEqual({ allowed: false, reason: 'already_a_member' });
  });

  it('allows a comp for a lapsed member', () => {
    expect(
      decideCompMembership({
        subscription: { status: 'canceled', currentPeriodEnd: null },
        lookupFailed: false,
      }),
    ).toEqual({ allowed: true });
  });

  it('refuses when the membership state could not be read', () => {
    // grantYearlyMembership rotates an existing member's password and reveals it
    // only in the welcome email, so a comp issued on a bad guess locks a paying
    // member out of their own account.
    expect(decideCompMembership({ subscription: null, lookupFailed: true })).toEqual({
      allowed: false,
      reason: 'membership_unverifiable',
    });
  });
});

describe('compAttendeeMembership', () => {
  it('grants the membership for an eligible attendee', async () => {
    const outcome = await compAttendeeMembership({
      signInId: 'sign-in-1',
      priceAud: 295,
      appOrigin: 'https://carsi.example.test',
    });

    expect(outcome.ok).toBe(true);
    expect(mocks.grant).toHaveBeenCalledWith({
      email: 'attendee@example.test',
      fullName: 'Sam Attendee',
      priceAud: 295,
      appOrigin: 'https://carsi.example.test',
    });
  });

  it('refuses an unknown sign-in without granting anything', async () => {
    mocks.findSignIn.mockResolvedValue(null);

    await expect(
      compAttendeeMembership({ signInId: 'nope', priceAud: 295, appOrigin: 'https://x.test' }),
    ).resolves.toEqual({ ok: false, reason: 'not_found' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it.each([
    ['only attended day 1', { day2CheckedInAt: null }],
    ['did not opt in to email', { emailOptIn: false }],
    ['has not been provisioned', { studentId: null, enrollmentId: null, provisionStatus: 'pending' }],
  ])('refuses an attendee who %s', async (_label, overrides) => {
    mocks.findSignIn.mockResolvedValue(eligibleSignIn(overrides));

    const outcome = await compAttendeeMembership({
      signInId: 'sign-in-1',
      priceAud: 295,
      appOrigin: 'https://x.test',
    });

    // An admin comp must not reach someone the offer itself would never show to.
    expect(outcome).toEqual({ ok: false, reason: 'not_offer_eligible' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it('refuses when the attendee already holds a live membership', async () => {
    mocks.findSubscription.mockResolvedValue({ status: 'active', currentPeriodEnd: null });

    await expect(
      compAttendeeMembership({ signInId: 'sign-in-1', priceAud: 0, appOrigin: 'https://x.test' }),
    ).resolves.toEqual({ ok: false, reason: 'already_a_member' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it('refuses — rather than granting — when the membership lookup throws', async () => {
    mocks.findSubscription.mockRejectedValue(new Error('connection refused'));

    await expect(
      compAttendeeMembership({ signInId: 'sign-in-1', priceAud: 0, appOrigin: 'https://x.test' }),
    ).resolves.toEqual({ ok: false, reason: 'membership_unverifiable' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it('keeps the attendee id out of the log line when the lookup fails (CWE-532)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.findSubscription.mockRejectedValue(new Error('connection refused'));

    await compAttendeeMembership({
      signInId: 'sign-in-1',
      priceAud: 0,
      appOrigin: 'https://x.test',
    });

    const logged = spy.mock.calls.flat().map(String).join(' ');
    expect(logged).not.toContain('user-1');
    expect(logged).not.toContain('attendee@example.test');
  });
});


describe('an unrecognised membership status refuses, rather than granting', () => {
  it.each([
    ['an abandoned incomplete checkout', 'incomplete'],
    ['a status we do not recognise', 'some_new_stripe_status'],
  ])('refuses on %s', (_label, status) => {
    // `entitled: false` is not the same as "safe to comp": an unrecognised
    // status is exactly the case where we cannot say whether this person is
    // paying us, and granting would rotate their password on a guess.
    expect(
      decideCompMembership({
        subscription: { status, currentPeriodEnd: null },
        lookupFailed: false,
      }),
    ).toEqual({ allowed: false, reason: 'membership_unverifiable' });
  });

  it('still allows a comp for an explicitly terminal status', () => {
    // `canceled` is understood, not unknown — the attendee demonstrably has no
    // live membership, so the comp proceeds.
    expect(
      decideCompMembership({
        subscription: { status: 'canceled', currentPeriodEnd: null },
        lookupFailed: false,
      }),
    ).toEqual({ allowed: true });
  });
});

describe('a second comp for the same attendee', () => {
  it('is refused, because a repeat would rotate the member’s password', async () => {
    // count 0 = the set-if-null UPDATE matched nothing, so someone already holds
    // the claim. The database decided that, not this process.
    mocks.claimComp.mockResolvedValue({ count: 0 });

    await expect(
      compAttendeeMembership(
        { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
        NOW,
      ),
    ).resolves.toEqual({ ok: false, reason: 'already_comped' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it('claims with a set-if-null UPDATE, so two callers cannot both win', async () => {
    await compAttendeeMembership(
      { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
      NOW,
    );

    // Without `membershipCompedAt: null` in the WHERE, every caller would "win"
    // and the claim would stop nothing.
    expect(mocks.claimComp.mock.calls[0][0]).toEqual({
      where: { id: 'sign-in-1', membershipCompedAt: null },
      data: { membershipCompedAt: NOW },
    });
  });

  it('claims BEFORE granting, never after', async () => {
    const order: string[] = [];
    mocks.claimComp.mockImplementation(async () => {
      order.push('claim');
      return { count: 1 };
    });
    mocks.grant.mockImplementation(async () => {
      order.push('grant');
      return { userId: 'user-1' };
    });

    await compAttendeeMembership(
      { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
      NOW,
    );

    // Reversed, the loser of a real race would already have had their password
    // rotated by the time the claim refused them.
    expect(order).toEqual(['claim', 'grant']);
  });

  it('refuses rather than granting when the claim query throws', async () => {
    mocks.claimComp.mockRejectedValue(new Error('connection refused'));

    await expect(
      compAttendeeMembership(
        { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
        NOW,
      ),
    ).resolves.toEqual({ ok: false, reason: 'membership_unverifiable' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it('is not claimed at all when the request is refused earlier', async () => {
    mocks.findSubscription.mockResolvedValue({ status: 'active', currentPeriodEnd: null });

    await compAttendeeMembership(
      { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
      NOW,
    );

    // A refused request must not consume the attendee's one comp.
    expect(mocks.claimComp).not.toHaveBeenCalled();
  });
});

describe('a claim never outlives a failed grant', () => {
  it('is released when grantYearlyMembership throws', async () => {
    mocks.grant.mockRejectedValue(new Error('NO_PUBLISHED_COURSES'));

    await expect(
      compAttendeeMembership(
        { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
        NOW,
      ),
    ).rejects.toThrow('NO_PUBLISHED_COURSES');

    // Scoped to the exact timestamp this call wrote, so a claim someone else has
    // since taken is never cleared. Otherwise one failure would lock the
    // attendee out of ever being comped.
    expect(mocks.claimComp.mock.calls[1][0]).toEqual({
      where: { id: 'sign-in-1', membershipCompedAt: NOW },
      data: { membershipCompedAt: null },
    });
  });

  it('is NOT released after a successful grant', async () => {
    await compAttendeeMembership(
      { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
      NOW,
    );

    expect(mocks.claimComp).toHaveBeenCalledTimes(1);
  });
});


describe('an attendee part-way through the self-serve checkout', () => {
  it('is refused, not comped', () => {
    // `decideMembershipEntitlement` maps `checkout_pending` to `reason: 'none'`
    // on purpose — a reservation grants no catalogue access. But comping here
    // rotates the password on the account they are using to pay A$295, and the
    // new one exists only in an email that can lag or bounce.
    expect(
      decideCompMembership({
        subscription: { status: 'checkout_pending', currentPeriodEnd: null },
        lookupFailed: false,
      }),
    ).toEqual({ allowed: false, reason: 'checkout_in_progress' });
  });

  it('is refused however the status is cased or padded', () => {
    expect(
      decideCompMembership({
        subscription: { status: '  Checkout_Pending ', currentPeriodEnd: null },
        lookupFailed: false,
      }),
    ).toEqual({ allowed: false, reason: 'checkout_in_progress' });
  });

  it('reaches no grant through the full service path', async () => {
    mocks.findSubscription.mockResolvedValue({
      status: 'checkout_pending',
      currentPeriodEnd: null,
    });

    await expect(
      compAttendeeMembership(
        { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
        NOW,
      ),
    ).resolves.toEqual({ ok: false, reason: 'checkout_in_progress' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });
});

describe('the membership check follows the identity the grant will act on', () => {
  it('resolves the learner by EMAIL, as grantYearlyMembership does', async () => {
    await compAttendeeMembership(
      { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
      NOW,
    );

    // Keyed on studentId instead, the guard would skip every row that is
    // eligible via `provisionStatus` alone but still has a real LMS user.
    expect(mocks.findUser).toHaveBeenCalledWith({
      where: { email: 'attendee@example.test' },
      select: { id: true },
    });
  });

  it('guards a row whose studentId is null but whose email is a paying member', async () => {
    mocks.findSignIn.mockResolvedValue(
      eligibleSignIn({ studentId: null, enrollmentId: null, provisionStatus: 'provisioned' }),
    );
    mocks.findUser.mockResolvedValue({ id: 'user-9' });
    mocks.findSubscription.mockResolvedValue({ status: 'active', currentPeriodEnd: null });

    await expect(
      compAttendeeMembership(
        { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
        NOW,
      ),
    ).resolves.toEqual({ ok: false, reason: 'already_a_member' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it('allows the comp when no LMS user exists for that email yet', async () => {
    mocks.findUser.mockResolvedValue(null);

    const outcome = await compAttendeeMembership(
      { signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' },
      NOW,
    );

    expect(outcome.ok).toBe(true);
    expect(mocks.findSubscription).not.toHaveBeenCalled();
  });
});
