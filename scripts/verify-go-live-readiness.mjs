#!/usr/bin/env node
/**
 * Pre-flip and post-flip checklist for the membership switches (run locally against prod or
 * staging). READ-ONLY: GET requests, plus unauthenticated checkout POSTs that the app refuses
 * before any Stripe call.
 *
 * Usage:
 *   BASE_URL=https://carsi.com.au node scripts/verify-go-live-readiness.mjs
 *
 * Environment:
 *   BASE_URL                            site to probe (default https://carsi.com.au)
 *   EXPECT_SUBSCRIPTIONS_ENABLED        state you expect SUBSCRIPTIONS_ENABLED to be in (default false)
 *   EXPECT_TEAMS_SUBSCRIPTIONS_ENABLED  state you expect TEAMS_SUBSCRIPTIONS_ENABLED to be in (default false)
 *   STRIPE_PRICE_PRO_ANNUAL             the yearly Price id set on the app; only its shape is checked,
 *                                       the value is never printed
 *   ALLOW_PRICE_LOOKUP_KEY=true         accept lookup-key resolution instead; the price is then
 *                                       reported as NOT CHECKED, never as passed
 *
 * Exit codes:
 *   0  every check passed
 *   1  at least one check failed
 *   2  no check failed, but at least one could not be judged because of the infrastructure
 *      (gateway 502/504, a 503 with no app message, or no connection). That is NOT "disabled".
 */
import { pathToFileURL } from 'node:url';

/** Same truthy set as src/lib/server/subscriptions-flag.ts. */
export function envTrue(value) {
  if (!value) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** The pricing-card test ids rendered by src/components/pricing/PricingTiers.tsx. */
export function tierCtaTestId(tierId, comingSoon) {
  return `pricing-${tierId}-${comingSoon ? 'coming-soon' : 'buy'}`;
}

const GATEWAY_STATUSES = new Set([502, 504]);

/**
 * What a response means, separating the app's own answers from the platform's.
 *
 * The app's intentional "switched off" 503 always carries a JSON `detail` message. A gateway
 * (DigitalOcean's load balancer) answers 502/504, or a 503 without that message, when the app
 * is down or slow. Reading those as "disabled" would report a broken site as a healthy dark one.
 *
 * @param {{ status: number | null, json?: unknown, error?: unknown }} res
 * @returns {'infrastructure' | 'disabled' | 'auth-required' | 'ok' | 'unexpected'}
 */
export function classifyResponse(res) {
  if (res.error || res.status == null) return 'infrastructure';
  if (GATEWAY_STATUSES.has(res.status)) return 'infrastructure';
  if (res.status === 503) {
    const detail = res.json && typeof res.json === 'object' ? res.json.detail : undefined;
    return typeof detail === 'string' && detail.trim() !== '' ? 'disabled' : 'infrastructure';
  }
  if (res.status === 401) return 'auth-required';
  if (res.status >= 200 && res.status < 300) return 'ok';
  return 'unexpected';
}

function infra(name, res) {
  const why = res.error ? `no response (${res.error})` : `HTTP ${res.status}`;
  return { name, result: 'INFRA', detail: `${why}: infrastructure failure, not "disabled"` };
}

/**
 * Which state a plan's card is in on the /pricing HTML: 'coming-soon', 'buy', or 'missing'
 * (neither id found, e.g. the markup changed). Both at once is 'ambiguous'.
 */
export function pricingCardState(html, tierId) {
  const soon = html.includes(`data-testid="${tierCtaTestId(tierId, true)}"`);
  const buy = html.includes(`data-testid="${tierCtaTestId(tierId, false)}"`);
  if (soon && buy) return 'ambiguous';
  if (soon) return 'coming-soon';
  if (buy) return 'buy';
  return 'missing';
}

/** Check: a plan's card on /pricing matches the flag state the operator expects. */
export function checkPricingCard({ name, res, tierId, expectOnSale }) {
  if (classifyResponse(res) === 'infrastructure') return infra(name, res);
  if (classifyResponse(res) !== 'ok') {
    return { name, result: 'FAIL', detail: `HTTP ${res.status}` };
  }
  const state = pricingCardState(res.text ?? '', tierId);
  const want = expectOnSale ? 'buy' : 'coming-soon';
  return {
    name,
    result: state === want ? 'OK' : 'FAIL',
    detail: `card is "${state}", expected "${want}"`,
  };
}

/**
 * Check: the Teams checkout answers an unauthenticated POST the way the Teams switch says.
 * The route reads the flag before the session, so off = the app's 503 and on = 401.
 */
export function checkTeamsCheckout({ res, expectOnSale }) {
  const name = `Teams checkout ${expectOnSale ? 'asks for sign-in (on sale)' : 'returns the app 503 (off)'}`;
  const kind = classifyResponse(res);
  if (kind === 'infrastructure') return infra(name, res);
  const want = expectOnSale ? 'auth-required' : 'disabled';
  return {
    name,
    result: kind === want && !res.json?.url ? 'OK' : 'FAIL',
    detail: `HTTP ${res.status} (${kind})`,
  };
}

/**
 * Check: the individual checkout refuses an unauthenticated POST and returns no Checkout URL.
 * It reads the session before the flag, so this proves fail-closed, not the flag state.
 */
export function checkIndividualCheckout({ res }) {
  const name = 'Yearly checkout fails closed without a session';
  const kind = classifyResponse(res);
  if (kind === 'infrastructure') return infra(name, res);
  return {
    name,
    result: kind !== 'ok' && !res.json?.url ? 'OK' : 'FAIL',
    detail: `HTTP ${res.status} (${kind})`,
  };
}

/** Check: the subscription status API fails closed for an anonymous caller. */
export function checkSubscriptionStatus({ res }) {
  const name = 'Subscription status API (fail-closed default)';
  if (classifyResponse(res) === 'infrastructure') return infra(name, res);
  return {
    name,
    result: res.status === 200 && res.json?.has_subscription === false ? 'OK' : 'FAIL',
    detail: JSON.stringify(res.json ?? res.status),
  };
}

/** Check: the professional directory health endpoint still reports the stub blocked. */
export function checkDirectoryHealth({ res }) {
  const name = 'Professional directory health';
  if (classifyResponse(res) === 'infrastructure') return infra(name, res);
  return {
    name,
    result: res.status === 200 && res.json?.listingCount === 0 ? 'OK' : 'FAIL',
    detail: JSON.stringify(res.json ?? res.status),
  };
}

/**
 * Check: the yearly Price id is available to compare against the app. Only its shape is
 * inspected and the value is never echoed. Lookup-key resolution is accepted only when the
 * operator opts in, and is then reported as NOT CHECKED rather than OK.
 */
export function checkYearlyPriceEnv(env) {
  const name = 'Yearly Price id (STRIPE_PRICE_PRO_ANNUAL)';
  const value = env.STRIPE_PRICE_PRO_ANNUAL?.trim();
  if (value) {
    return /^price_[A-Za-z0-9]+$/.test(value)
      ? { name, result: 'OK', detail: 'present, price_ shape (value not shown)' }
      : { name, result: 'FAIL', detail: 'present but not a price_... id (value not shown)' };
  }
  if (envTrue(env.ALLOW_PRICE_LOOKUP_KEY)) {
    return {
      name,
      result: 'SKIP',
      detail:
        'NOT CHECKED: operator chose lookup_key carsi_pro_annual. Confirm that Price in Stripe.',
    };
  }
  return {
    name,
    result: 'FAIL',
    detail:
      'not set in this shell. Export the id set on the app, or set ALLOW_PRICE_LOOKUP_KEY=true.',
  };
}

/** Exit code for a list of check results (see the header). */
export function exitCodeFor(results) {
  if (results.some((r) => r.result === 'FAIL')) return 1;
  if (results.some((r) => r.result === 'INFRA')) return 2;
  return 0;
}

async function request(base, path, init = {}) {
  try {
    const res = await fetch(`${base}${path}`, init);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, json, text };
  } catch (e) {
    return {
      status: null,
      json: null,
      text: '',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function runChecks({ base, env }) {
  const expectYearly = envTrue(env.EXPECT_SUBSCRIPTIONS_ENABLED);
  // Teams needs both switches, exactly like teamSubscriptionsEnabled().
  const expectTeams = expectYearly && envTrue(env.EXPECT_TEAMS_SUBSCRIPTIONS_ENABLED);
  const json = { headers: { Accept: 'application/json' } };
  const post = (body) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });

  const [pricing, status, dir, checkout, teamsCheckout] = await Promise.all([
    request(base, '/pricing', { headers: { Accept: 'text/html' } }),
    request(base, '/api/lms/subscription/status', json),
    request(base, '/api/health/professional-directory', json),
    request(base, '/api/lms/subscription/checkout', post('{}')),
    request(base, '/api/lms/subscription/teams/checkout', post('{"tier":"starter"}')),
  ]);

  return [
    checkPricingCard({
      name: `Pricing page: yearly card is ${expectYearly ? 'on sale' : 'coming soon'}`,
      res: pricing,
      tierId: 'pro_annual',
      expectOnSale: expectYearly,
    }),
    checkPricingCard({
      name: `Pricing page: Teams card is ${expectTeams ? 'on sale' : 'coming soon'}`,
      res: pricing,
      tierId: 'starter',
      expectOnSale: expectTeams,
    }),
    checkYearlyPriceEnv(env),
    checkSubscriptionStatus({ res: status }),
    checkDirectoryHealth({ res: dir }),
    checkIndividualCheckout({ res: checkout }),
    checkTeamsCheckout({ res: teamsCheckout, expectOnSale: expectTeams }),
  ];
}

async function main() {
  const base = (process.env.BASE_URL ?? 'https://carsi.com.au').replace(/\/$/, '');
  console.log(`Probing ${base}`);
  const results = await runChecks({ base, env: process.env });
  for (const r of results) console.log(`${r.result}: ${r.name} — ${r.detail}`);

  const code = exitCodeFor(results);
  if (code === 1) {
    console.error('\nAt least one check failed. Fix before flipping the membership switches.');
  } else if (code === 2) {
    console.error(
      '\nThe site could not be judged: infrastructure failure (gateway or connection). ' +
        'This is not the same as a plan being switched off. Fix it and run again.'
    );
  } else {
    console.log('\nAll automated checks passed.');
    console.log('Manual steps remain: Stripe Prices, Test Clock checklist, DigitalOcean env vars.');
  }
  process.exit(code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error('FAIL:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
