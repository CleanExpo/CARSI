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
  findEnrollment: vi.fn(),
  grant: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ccwRoadshowSignIn: { findUnique: mocks.findSignIn },
    lmsSubscription: { findUnique: mocks.findSubscription },
    lmsEnrollment: { findFirst: mocks.findEnrollment },
  },
}));

vi.mock('@/lib/admin/admin-yearly-membership', () => ({
  grantYearlyMembership: mocks.grant,
  YEARLY_MEMBERSHIP_PAYMENT_PREFIX: 'admin:yearly-membership:',
}));

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
  mocks.findEnrollment.mockReset().mockResolvedValue(null);
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
    // A completed comp writes enrolments, not a subscription row, so the
    // membership check cannot see it. The payment-reference stamp is the marker.
    mocks.findEnrollment.mockResolvedValue({ id: 'enrol-1' });

    await expect(
      compAttendeeMembership({ signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' }),
    ).resolves.toEqual({ ok: false, reason: 'already_comped' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it('looks for the grant stamp, not for any enrolment at all', async () => {
    await compAttendeeMembership({
      signInId: 'sign-in-1',
      priceAud: 295,
      appOrigin: 'https://x.test',
    });

    // Matching any enrolment would refuse every attendee, since they are all
    // enrolled in the 2-day workshop course by provisioning.
    expect(mocks.findEnrollment.mock.calls[0][0].where.paymentReference).toEqual({
      startsWith: 'admin:yearly-membership:',
    });
  });

  it('refuses rather than granting when the prior-grant lookup throws', async () => {
    mocks.findEnrollment.mockRejectedValue(new Error('connection refused'));

    await expect(
      compAttendeeMembership({ signInId: 'sign-in-1', priceAud: 295, appOrigin: 'https://x.test' }),
    ).resolves.toEqual({ ok: false, reason: 'membership_unverifiable' });
    expect(mocks.grant).not.toHaveBeenCalled();
  });
});
