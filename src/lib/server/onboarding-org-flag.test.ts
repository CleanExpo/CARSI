/**
 * The onboarding org path (monthly organisation subscription at checkout, and free enrolment
 * for members of an active org) must stay inert unless TEAMS_SUBSCRIPTIONS_ENABLED is on too.
 * Launching the yearly membership alone (SUBSCRIPTIONS_ENABLED=true) must not sell or grant it.
 *
 * Both routes read the flag after the session check, so each case runs with a signed-in user,
 * a resolvable org Price and an active org entitlement: the only thing keeping the org path shut
 * is the flag.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  provision: vi.fn(),
  sessionCreate: vi.fn(),
  oneOffCheckout: vi.fn(),
  orgEntitlements: vi.fn(),
  enrol: vi.fn(),
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(async () => ({ sub: 'user-1', email: 'owner@example.test' })),
}));
vi.mock('@/lib/server/onboarding-programs', () => ({
  getOnboardingCourseBySlug: vi.fn(async () => ({
    id: 'course-1',
    title: 'CARSI Maintenance Company Onboarding — Acme Cleaning',
    shortDescription: '',
    meta: null,
    category: 'Maintenance',
  })),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: { lmsEnrollment: { findUnique: vi.fn(async () => null) } },
}));
vi.mock('@/lib/server/org-subscription-price', () => ({
  resolveOrgMonthlyPriceId: vi.fn(async () => 'price_org_monthly'),
}));
vi.mock('@/lib/server/org-subscription-provision', () => ({
  provisionOrgSubscriptionContainer: mocks.provision,
}));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.sessionCreate } } }),
}));
vi.mock('@/lib/server/onboarding-checkout', () => ({
  buildOnboardingCheckoutUrls: () => ({
    success_url: 'https://carsi.example.test/ok',
    cancel_url: 'https://carsi.example.test/cancel',
  }),
  createOnboardingStripeCheckout: mocks.oneOffCheckout,
}));
vi.mock('@/lib/server/entitlements', () => ({ getOrgEntitlements: mocks.orgEntitlements }));
vi.mock('@/lib/server/enrollment-service', () => ({ enrollStudentInCourse: mocks.enrol }));

import { POST as checkout } from '../../../app/api/lms/onboarding/[slug]/checkout/route';
import { POST as enroll } from '../../../app/api/lms/onboarding/[slug]/enroll/route';

const COMBOS = [
  { subs: undefined, teams: undefined, team: false },
  { subs: 'false', teams: 'true', team: false },
  { subs: 'true', teams: undefined, team: false },
  { subs: 'true', teams: 'false', team: false },
  { subs: 'true', teams: 'true', team: true },
] as const;

function setFlags(subs: string | undefined, teams: string | undefined) {
  if (subs === undefined) delete process.env.SUBSCRIPTIONS_ENABLED;
  else process.env.SUBSCRIPTIONS_ENABLED = subs;
  if (teams === undefined) delete process.env.TEAMS_SUBSCRIPTIONS_ENABLED;
  else process.env.TEAMS_SUBSCRIPTIONS_ENABLED = teams;
}

const saved = {
  subs: process.env.SUBSCRIPTIONS_ENABLED,
  teams: process.env.TEAMS_SUBSCRIPTIONS_ENABLED,
  stripe: process.env.STRIPE_SECRET_KEY,
  db: process.env.DATABASE_URL,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.provision.mockResolvedValue({ ok: true, result: { teamId: 'team-1' } });
  mocks.sessionCreate.mockResolvedValue({ url: 'https://stripe.example.test/org' });
  mocks.oneOffCheckout.mockResolvedValue({ checkout_url: 'https://stripe.example.test/one-off' });
  mocks.orgEntitlements.mockResolvedValue({
    hasActiveOrg: true,
    entitledCategory: 'Maintenance',
    teamId: 'team-1',
  });
  mocks.enrol.mockResolvedValue('enrolled');
  process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic';
  process.env.DATABASE_URL = 'postgres://configured';
});

afterEach(() => {
  setFlags(saved.subs, saved.teams);
  if (saved.stripe === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = saved.stripe;
  if (saved.db === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = saved.db;
});

function post(path: string): NextRequest {
  return new NextRequest(`https://carsi.example.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ organisation_name: 'Acme Cleaning' }),
  });
}
const ctx = { params: Promise.resolve({ slug: 'acme-cleaning' }) };

describe('onboarding checkout: org subscription needs BOTH flags', () => {
  for (const c of COMBOS) {
    it(`SUBSCRIPTIONS_ENABLED=${String(c.subs)} TEAMS=${String(c.teams)}`, async () => {
      setFlags(c.subs, c.teams);
      const res = await checkout(post('/api/lms/onboarding/acme-cleaning/checkout'), ctx);
      expect(res.status).toBe(200);
      const body = await res.json();
      if (c.team) {
        expect(body.checkout_url).toBe('https://stripe.example.test/org');
        expect(mocks.provision).toHaveBeenCalledTimes(1);
        expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
        expect(mocks.oneOffCheckout).not.toHaveBeenCalled();
      } else {
        expect(body.checkout_url).toBe('https://stripe.example.test/one-off');
        expect(mocks.provision).not.toHaveBeenCalled();
        expect(mocks.sessionCreate).not.toHaveBeenCalled();
        expect(mocks.oneOffCheckout).toHaveBeenCalledTimes(1);
      }
    });
  }
});

describe('onboarding enroll: free org enrolment needs BOTH flags', () => {
  for (const c of COMBOS) {
    it(`SUBSCRIPTIONS_ENABLED=${String(c.subs)} TEAMS=${String(c.teams)}`, async () => {
      setFlags(c.subs, c.teams);
      const res = await enroll(post('/api/lms/onboarding/acme-cleaning/enroll'), ctx);
      if (c.team) {
        expect(res.status).toBe(200);
        expect((await res.json()).included_in_org_subscription).toBe(true);
        expect(mocks.enrol).toHaveBeenCalledTimes(1);
      } else {
        expect(res.status).toBe(402);
        expect(mocks.orgEntitlements).not.toHaveBeenCalled();
        expect(mocks.enrol).not.toHaveBeenCalled();
      }
    });
  }
});
