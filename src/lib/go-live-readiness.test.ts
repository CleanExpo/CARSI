/**
 * `scripts/verify-go-live-readiness.mjs` — the read-only pre-flip / post-flip checklist.
 *
 * The case that matters most: a DigitalOcean gateway 502/504 (or a bare 503) must be reported
 * as an infrastructure failure, never as "the plan is switched off". Both look like "not on
 * sale" from outside, and only one of them is healthy. The reverse matters too: DO's edge
 * rewrites the app's intentional 503 into an HTML 504 and keeps the real status in
 * `x-do-orig-status`, and that must read as switched off, not as an outage.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import {
  checkPricingCard,
  checkTeamsCheckout,
  checkYearlyPriceEnv,
  classifyResponse,
  exitCodeFor,
  pricingCardState,
  runChecks,
  // @ts-expect-error -- the checklist is dependency-free plain ESM with no type declarations.
} from '../../scripts/verify-go-live-readiness.mjs';
import { tierCtaTestId } from '@/components/pricing/PricingTiers';

const APP_503 = {
  status: 503,
  json: { detail: 'Teams membership purchasing is not yet available.' },
};

describe('classifyResponse', () => {
  it('gateway 502 and 504 are infrastructure, not disabled', () => {
    expect(classifyResponse({ status: 502, json: null })).toBe('infrastructure');
    expect(classifyResponse({ status: 504, json: null })).toBe('infrastructure');
    // Even if a gateway page happened to parse as JSON with a detail, 504 is still the platform.
    expect(classifyResponse({ status: 504, json: { detail: 'x' } })).toBe('infrastructure');
  });

  it("the app's own 503 (JSON detail) is disabled; a bare 503 is infrastructure", () => {
    expect(classifyResponse(APP_503)).toBe('disabled');
    expect(classifyResponse({ status: 503, json: null })).toBe('infrastructure');
    expect(classifyResponse({ status: 503, json: { detail: '  ' } })).toBe('infrastructure');
  });

  it('no connection is infrastructure', () => {
    expect(classifyResponse({ status: null, error: 'ECONNREFUSED' })).toBe('infrastructure');
  });

  describe('DigitalOcean edge rewrite (x-do-orig-status)', () => {
    // The shape measured on carsi.com.au 17/09/2026: HTML 504 body, app status in the header.
    const edge = (origStatus: number | null) => ({ status: 504, origStatus, json: null });

    it('504 + x-do-orig-status 503 is the app switched off (disabled)', () => {
      expect(classifyResponse(edge(503))).toBe('disabled');
    });

    it('504 with no header is infrastructure', () => {
      expect(classifyResponse(edge(null))).toBe('infrastructure');
      expect(classifyResponse({ status: 504, json: null })).toBe('infrastructure');
    });

    it('504 + x-do-orig-status 504 is infrastructure', () => {
      expect(classifyResponse(edge(504))).toBe('infrastructure');
    });

    it('any other app 5xx behind the edge is infrastructure', () => {
      for (const s of [500, 502]) expect(classifyResponse(edge(s))).toBe('infrastructure');
    });

    it('the header wins over the outer status for non-errors too', () => {
      expect(classifyResponse({ status: 504, origStatus: 401, json: null })).toBe('auth-required');
      expect(classifyResponse({ status: 200, origStatus: 200, json: {} })).toBe('ok');
    });

    it('records both statuses in the check output', () => {
      const off = checkTeamsCheckout({ res: edge(503), expectOnSale: false });
      expect(off.result).toBe('OK');
      expect(off.detail).toBe('HTTP 503 (edge rewrote to 504) (disabled)');
      const broken = checkTeamsCheckout({ res: edge(504), expectOnSale: false });
      expect(broken.result).toBe('INFRA');
      expect(broken.detail).toContain('HTTP 504');
      expect(broken.detail).not.toContain('edge rewrote');
    });
  });

  it('401, 2xx and anything else', () => {
    expect(classifyResponse({ status: 401, json: {} })).toBe('auth-required');
    expect(classifyResponse({ status: 200, json: {} })).toBe('ok');
    expect(classifyResponse({ status: 500, json: {} })).toBe('unexpected');
  });
});

describe('Teams checkout check', () => {
  it('flag off: app 503 passes, gateway 504 is INFRA (not a pass)', () => {
    expect(checkTeamsCheckout({ res: APP_503, expectOnSale: false }).result).toBe('OK');
    const gw = checkTeamsCheckout({ res: { status: 504, json: null }, expectOnSale: false });
    expect(gw.result).toBe('INFRA');
    expect(gw.detail).toContain('infrastructure failure');
  });

  it('flag on: 401 passes, app 503 fails', () => {
    expect(checkTeamsCheckout({ res: { status: 401, json: {} }, expectOnSale: true }).result).toBe(
      'OK'
    );
    expect(checkTeamsCheckout({ res: APP_503, expectOnSale: true }).result).toBe('FAIL');
  });

  it('a Checkout URL in the body always fails', () => {
    const res = { status: 401, json: { url: 'https://checkout.stripe.com/x' } };
    expect(checkTeamsCheckout({ res, expectOnSale: true }).result).toBe('FAIL');
  });
});

describe('pricing card check', () => {
  const soon = `<span data-testid="${tierCtaTestId('pro_annual', true)}">Coming soon</span>`;
  const buy = `<a data-testid="${tierCtaTestId('pro_annual', false)}">Start membership</a>`;

  it('reads the ids PricingTiers renders', () => {
    expect(pricingCardState(soon, 'pro_annual')).toBe('coming-soon');
    expect(pricingCardState(buy, 'pro_annual')).toBe('buy');
    expect(pricingCardState('<p>changed markup</p>', 'pro_annual')).toBe('missing');
    expect(pricingCardState(soon + buy, 'pro_annual')).toBe('ambiguous');
  });

  it('passes only when the card matches the expected flag state', () => {
    const args = { name: 'yearly', tierId: 'pro_annual' };
    expect(
      checkPricingCard({ ...args, res: { status: 200, text: soon }, expectOnSale: false }).result
    ).toBe('OK');
    expect(
      checkPricingCard({ ...args, res: { status: 200, text: buy }, expectOnSale: false }).result
    ).toBe('FAIL');
    expect(
      checkPricingCard({ ...args, res: { status: 200, text: buy }, expectOnSale: true }).result
    ).toBe('OK');
    expect(
      checkPricingCard({ ...args, res: { status: 200, text: '' }, expectOnSale: false }).result
    ).toBe('FAIL');
    expect(
      checkPricingCard({ ...args, res: { status: 502, text: '' }, expectOnSale: false }).result
    ).toBe('INFRA');
  });
});

describe('yearly Price env check', () => {
  const secretShaped = ['price', '1AbCdEf'].join('_');

  it('present with price_ shape passes and never echoes the value', () => {
    const r = checkYearlyPriceEnv({ STRIPE_PRICE_PRO_ANNUAL: secretShaped });
    expect(r.result).toBe('OK');
    expect(JSON.stringify(r)).not.toContain(secretShaped);
  });

  it('wrong shape fails without echoing it', () => {
    const r = checkYearlyPriceEnv({ STRIPE_PRICE_PRO_ANNUAL: 'prod_123' });
    expect(r.result).toBe('FAIL');
    expect(JSON.stringify(r)).not.toContain('prod_123');
  });

  it('absent fails, unless the operator opts into lookup-key, which is SKIP not OK', () => {
    expect(checkYearlyPriceEnv({}).result).toBe('FAIL');
    const r = checkYearlyPriceEnv({ ALLOW_PRICE_LOOKUP_KEY: 'true' });
    expect(r.result).toBe('SKIP');
    expect(r.detail).toContain('NOT CHECKED');
  });
});

describe('exit code', () => {
  it('FAIL beats INFRA beats OK/SKIP', () => {
    expect(exitCodeFor([{ result: 'OK' }, { result: 'SKIP' }])).toBe(0);
    expect(exitCodeFor([{ result: 'OK' }, { result: 'INFRA' }])).toBe(2);
    expect(exitCodeFor([{ result: 'INFRA' }, { result: 'FAIL' }])).toBe(1);
  });
});

describe('runChecks against a local stand-in site', () => {
  let server: Server | undefined;
  afterEach(async () => {
    await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
    server = undefined;
  });

  async function serve(handler: Parameters<typeof createServer>[0]): Promise<string> {
    server = createServer(handler);
    await new Promise<void>((r) => server!.listen(0, '127.0.0.1', () => r()));
    return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
  }

  const json = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  /** `teamsOrigStatus` set = the DigitalOcean edge shape: HTML 504 + x-do-orig-status. */
  function darkSite(teamsCheckoutStatus: number, teamsOrigStatus?: string) {
    const methods: string[] = [];
    const handler: Parameters<typeof createServer>[0] = (req, res) => {
      methods.push(`${req.method} ${req.url}`);
      switch (req.url) {
        case '/pricing':
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end(
            `<span data-testid="pricing-pro_annual-coming-soon">Coming soon</span>` +
              `<span data-testid="pricing-starter-coming-soon">Coming soon</span>`
          );
          return;
        case '/api/lms/subscription/status':
          return json(res, 200, { has_subscription: false, reason: 'none' });
        case '/api/health/professional-directory':
          return json(res, 200, { listingCount: 0, stubBlocked: true });
        case '/api/lms/subscription/checkout':
          return json(res, 401, { detail: 'Sign in to start your membership.' });
        case '/api/lms/subscription/teams/checkout':
          if (teamsCheckoutStatus === 504) {
            res.writeHead(504, {
              'content-type': 'text/html',
              ...(teamsOrigStatus ? { 'x-do-orig-status': teamsOrigStatus } : {}),
            });
            res.end('<html>upstream request timeout</html>');
            return;
          }
          return json(res, teamsCheckoutStatus, {
            detail: 'Teams membership purchasing is not yet available.',
          });
        default:
          res.writeHead(404);
          res.end();
      }
    };
    return { handler, methods };
  }

  it('a healthy dark site passes every check (exit 0)', async () => {
    const site = darkSite(503);
    const base = await serve(site.handler);
    const results = await runChecks({ base, env: { ALLOW_PRICE_LOOKUP_KEY: 'true' } });
    expect(results.map((r: { result: string }) => r.result)).not.toContain('FAIL');
    expect(results.map((r: { result: string }) => r.result)).not.toContain('INFRA');
    expect(exitCodeFor(results)).toBe(0);
    // Read-only: only GETs, plus the two unauthenticated checkout POSTs.
    const posts = site.methods.filter((m) => m.startsWith('POST'));
    expect(posts.sort()).toEqual([
      'POST /api/lms/subscription/checkout',
      'POST /api/lms/subscription/teams/checkout',
    ]);
    expect(site.methods.every((m) => m.startsWith('GET') || m.startsWith('POST'))).toBe(true);
  });

  it('a gateway 504 on the Teams checkout exits 2 (infrastructure), not 0 (disabled)', async () => {
    const base = await serve(darkSite(504).handler);
    const results = await runChecks({ base, env: { ALLOW_PRICE_LOOKUP_KEY: 'true' } });
    const teams = results.find((r: { name: string }) => r.name.startsWith('Teams checkout'));
    expect(teams.result).toBe('INFRA');
    expect(exitCodeFor(results)).toBe(2);
  });

  it('the DO edge rewrite (504 + x-do-orig-status: 503) is read as switched off (exit 0)', async () => {
    const base = await serve(darkSite(504, '503').handler);
    const results = await runChecks({ base, env: { ALLOW_PRICE_LOOKUP_KEY: 'true' } });
    const teams = results.find((r: { name: string }) => r.name.startsWith('Teams checkout'));
    expect(teams.result).toBe('OK');
    expect(teams.detail).toContain('HTTP 503 (edge rewrote to 504)');
    expect(exitCodeFor(results)).toBe(0);
  });

  it('504 + x-do-orig-status: 504 still exits 2', async () => {
    const base = await serve(darkSite(504, '504').handler);
    const results = await runChecks({ base, env: { ALLOW_PRICE_LOOKUP_KEY: 'true' } });
    expect(exitCodeFor(results)).toBe(2);
  });

  it('expecting the yearly plan on sale against a dark site fails (exit 1)', async () => {
    const base = await serve(darkSite(503).handler);
    const results = await runChecks({
      base,
      env: { EXPECT_SUBSCRIPTIONS_ENABLED: 'true', ALLOW_PRICE_LOOKUP_KEY: 'true' },
    });
    const yearly = results.find((r: { name: string }) => r.name.startsWith('Pricing page: yearly'));
    expect(yearly.result).toBe('FAIL');
    expect(exitCodeFor(results)).toBe(1);
  });

  it('an unreachable site exits 2', async () => {
    const base = await serve(darkSite(503).handler);
    await new Promise<void>((r) => server!.close(() => r()));
    server = undefined;
    const results = await runChecks({ base, env: { ALLOW_PRICE_LOOKUP_KEY: 'true' } });
    expect(exitCodeFor(results)).toBe(2);
  });
});
