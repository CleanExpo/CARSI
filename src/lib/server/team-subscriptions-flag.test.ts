/**
 * The Teams switch (TEAMS_SUBSCRIPTIONS_ENABLED) is separate from the yearly one
 * (SUBSCRIPTIONS_ENABLED). Teams and org need BOTH; the yearly membership needs only its own.
 *
 * Every combination of the two flags is exercised, against the flag readers AND against the
 * six purchase/entitlement/membership routes and the two status routes, because a route that kept reading `subscriptionsEnabled()`
 * would put Teams on sale the moment the yearly membership launched.
 *
 * Each route is driven with NO session. Every one of them reads the flag before the session, so
 * a gated route answers 503 and an open one reaches the sign-in check and answers 401. Nothing
 * below the session check runs, which is why Stripe and the database are stubs that throw.
 *
 * The two GET status routes (Teams and org) answer 200 with a "none" payload when the flag is
 * off, when there is no session, and on any error, so a no-session request cannot tell them
 * apart. They are driven SIGNED IN with a stubbed, clearly non-default entitlement instead: a
 * gated route returns the "none" payload without reading the session, an open one returns the
 * stubbed status (GP-597).
 *
 * The onboarding routes read the Teams flag only after the session, so they are covered with a
 * signed-in user in onboarding-org-flag.test.ts.
 *
 * The route inventory at the end fails when an API route reads `teamSubscriptionsEnabled()` but
 * is in neither suite, so a new Teams or org route cannot be left out of the matrix.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { NextRequest } from 'next/server';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  teamEntitlements: vi.fn(),
  orgEntitlements: vi.fn(),
  unreachable: vi.fn(() => {
    throw new Error('reached past the flag and session checks');
  }),
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: mocks.claims,
}));
vi.mock('@/lib/server/entitlements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/entitlements')>()),
  getTeamEntitlements: mocks.teamEntitlements,
  getOrgEntitlements: mocks.orgEntitlements,
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
  mocks.teamEntitlements.mockReset();
  mocks.orgEntitlements.mockReset();
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
  ['teams invite accept', () => import('../../../app/api/lms/teams/invite/accept/route')],
] as const;

function post(): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/subscription/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tier: 'business_owner', slug: 'any', additional_seats: 1 }),
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

const USER = { sub: 'user-status-1', email: 'owner@example.test' };
const PERIOD_END = new Date('2027-01-31T00:00:00.000Z');

const STATUS_ROUTES = [
  {
    label: 'teams status',
    load: () => import('../../../app/api/lms/subscription/teams/status/route'),
    stub: () =>
      mocks.teamEntitlements.mockResolvedValue({
        hasActiveSeat: true,
        reason: 'active',
        entitledCourseIds: 'ALL',
        status: 'active',
        currentPeriodEnd: PERIOD_END,
        seatLimit: 5,
        seatsUsed: 2,
        teamId: 'team-1',
        isOwner: true,
      }),
    entitlements: () => mocks.teamEntitlements,
    none: {
      has_team_subscription: false,
      has_active_seat: false,
      status: null,
      reason: 'none',
      seat_limit: 0,
      seats_used: 0,
      seats_remaining: 0,
      current_period_end: null,
      is_owner: false,
      in_grace: false,
    },
    open: {
      has_team_subscription: true,
      has_active_seat: true,
      status: 'active',
      reason: 'active',
      seat_limit: 5,
      seats_used: 2,
      seats_remaining: 3,
      current_period_end: PERIOD_END.toISOString(),
      is_owner: true,
      in_grace: false,
    },
  },
  {
    label: 'org status',
    load: () => import('../../../app/api/lms/subscription/org/status/route'),
    stub: () =>
      mocks.orgEntitlements.mockResolvedValue({
        hasActiveOrg: true,
        reason: 'active',
        entitledCategory: 'Maintenance',
        status: 'active',
        currentPeriodEnd: PERIOD_END,
        teamId: 'team-1',
      }),
    entitlements: () => mocks.orgEntitlements,
    none: {
      has_org_subscription: false,
      has_active_org: false,
      status: null,
      reason: 'none',
      entitled_category: null,
      current_period_end: null,
      in_grace: false,
    },
    open: {
      has_org_subscription: true,
      has_active_org: true,
      status: 'active',
      reason: 'active',
      entitled_category: 'Maintenance',
      current_period_end: PERIOD_END.toISOString(),
      in_grace: false,
    },
  },
] as const;

function get(): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/subscription/x/status', {
    method: 'GET',
  });
}

describe('Teams and org status routes need BOTH flags (GP-597)', () => {
  for (const route of STATUS_ROUTES) {
    for (const c of COMBOS) {
      const want = c.team ? 'stubbed status' : 'none payload';
      it(`${route.label}: SUBSCRIPTIONS_ENABLED=${String(c.subs)} TEAMS=${String(c.teams)} -> ${want}`, async () => {
        setFlags(c.subs, c.teams);
        mocks.claims.mockResolvedValue(USER);
        route.stub();
        const { GET } = await route.load();
        const res = await GET(get());
        expect(res.status).toBe(200);
        const body = await res.json();
        if (c.team) {
          expect(body).toEqual(route.open);
          expect(route.entitlements()).toHaveBeenCalledWith(USER.sub);
        } else {
          expect(body).toEqual(route.none);
          // Gated by the flag, not by the session: neither the session nor the entitlement was read.
          expect(mocks.claims).not.toHaveBeenCalled();
          expect(route.entitlements()).not.toHaveBeenCalled();
        }
        expect(mocks.unreachable).not.toHaveBeenCalled();
      });
    }
  }
});

const REPO = resolve(__dirname, '../../..');
const ROUTE_SPECIFIER = /^(?:\.\.\/)+(app\/api\/.+\/route)$/;

/**
 * Route files a source really imports: static `import ... from` declarations and dynamic
 * `import()` calls, read from the parsed source. A route path that appears only in a comment or
 * a plain string is not an import, so it does not count as covered (GP-792).
 */
function routesImportedIn(source: string): Set<string> {
  const file = ts.createSourceFile('suite.ts', source, ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const routes = new Set<string>();
  for (const spec of specifiers) {
    const m = ROUTE_SPECIFIER.exec(spec);
    if (m) routes.add(`${m[1]}.ts`);
  }
  return routes;
}

function routesImportedBy(testFile: string): Set<string> {
  return routesImportedIn(readFileSync(join(REPO, testFile), 'utf8'));
}

function routesReadingTeamsFlag(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...routesReadingTeamsFlag(path));
    else if (
      entry.name === 'route.ts' &&
      readFileSync(path, 'utf8').includes('teamSubscriptionsEnabled')
    ) {
      found.push(relative(REPO, path));
    }
  }
  return found.sort();
}

describe('route inventory', () => {
  it('every API route that reads teamSubscriptionsEnabled() is in a flag-combo suite', () => {
    const readers = routesReadingTeamsFlag(join(REPO, 'app/api'));
    // The scan must see the routes it exists to protect, or an empty result would pass.
    expect(readers).toContain('app/api/lms/subscription/teams/status/route.ts');
    expect(readers).toContain('app/api/lms/subscription/org/status/route.ts');

    const covered = new Set([
      ...routesImportedBy('src/lib/server/team-subscriptions-flag.test.ts'),
      ...routesImportedBy('src/lib/server/onboarding-org-flag.test.ts'),
    ]);
    expect(readers.filter((r) => !covered.has(r))).toEqual([]);
  });

  it('counts a route only when the suite really imports it, never from a comment or string (GP-792)', () => {
    const source = [
      "import { POST } from '../../../app/api/real/static/route';",
      "const load = () => import('../../../app/api/real/dynamic/route');",
      "// import('../../../app/api/comment/line/route')",
      "/* '../../../app/api/comment/block/route' */",
      "const note = '../../../app/api/plain/string/route';",
    ].join('\n');
    expect([...routesImportedIn(source)].sort()).toEqual([
      'app/api/real/dynamic/route.ts',
      'app/api/real/static/route.ts',
    ]);
  });
});
