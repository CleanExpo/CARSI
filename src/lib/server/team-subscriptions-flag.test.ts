/**
 * The Teams switch (TEAMS_SUBSCRIPTIONS_ENABLED) is separate from the yearly one
 * (SUBSCRIPTIONS_ENABLED). Teams and org need BOTH; the yearly membership needs only its own.
 *
 * Every combination of the two flags is exercised, against the flag readers AND against the
 * five purchase/entitlement routes, because a route that kept reading `subscriptionsEnabled()`
 * would put Teams on sale the moment the yearly membership launched.
 *
 * Each route is driven with NO session. Every one of them reads the flag before the session, so
 * a gated route answers 503 and an open one reaches the sign-in check and answers 401. Nothing
 * below the session check runs, which is why Stripe and the database are stubs that throw.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  unreachable: vi.fn(() => {
    throw new Error('reached past the flag and session checks');
  }),
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: mocks.claims,
}));
vi.mock('@/lib/api/stripe', () => ({ getStripeClient: mocks.unreachable }));
vi.mock('@/lib/prisma', () => ({
  prisma: new Proxy({}, { get: () => mocks.unreachable }),
}));

import { subscriptionsEnabled, teamSubscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const COMBOS = [
  { subs: undefined, teams: undefined, yearly: false, team: false },
  { subs: 'false', teams: 'true', yearly: false, team: false },
  { subs: 'true', teams: undefined, yearly: true, team: false },
  { subs: 'true', teams: 'false', yearly: true, team: false },
  { subs: 'true', teams: 'true', yearly: true, team: true },
  { subs: ' ON ', teams: 'yes', yearly: true, team: true },
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
  mocks.claims.mockReset();
  mocks.claims.mockResolvedValue(null);
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

describe('flag readers — every combination', () => {
  for (const c of COMBOS) {
    it(`SUBSCRIPTIONS_ENABLED=${String(c.subs)} TEAMS_SUBSCRIPTIONS_ENABLED=${String(c.teams)}`, () => {
      setFlags(c.subs, c.teams);
      expect(subscriptionsEnabled()).toBe(c.yearly);
      expect(teamSubscriptionsEnabled()).toBe(c.team);
    });
  }
});

const ROUTES = [
  ['teams checkout', () => import('../../../app/api/lms/subscription/teams/checkout/route')],
  ['teams enroll', () => import('../../../app/api/lms/subscription/teams/enroll/route')],
  [
    'teams expand-seats',
    () => import('../../../app/api/lms/subscription/teams/expand-seats/route'),
  ],
  ['org checkout', () => import('../../../app/api/lms/subscription/org/checkout/route')],
  ['org enroll', () => import('../../../app/api/lms/subscription/org/enroll/route')],
] as const;

function post(): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/subscription/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tier: 'starter', slug: 'any', additional_seats: 1 }),
  });
}

describe('Teams and org routes need BOTH flags', () => {
  for (const [label, load] of ROUTES) {
    for (const c of COMBOS) {
      const want = c.team ? 401 : 503;
      it(`${label}: SUBSCRIPTIONS_ENABLED=${String(c.subs)} TEAMS=${String(c.teams)} -> ${want}`, async () => {
        setFlags(c.subs, c.teams);
        const { POST } = await load();
        const res = await POST(post());
        expect(res.status).toBe(want);
        // The gate is the flag, not an accident further down: a 503 never reached the session.
        if (!c.team) expect(mocks.claims).not.toHaveBeenCalled();
        expect(mocks.unreachable).not.toHaveBeenCalled();
      });
    }
  }
});
