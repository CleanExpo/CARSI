#!/usr/bin/env node
/**
 * Pre-flip checklist for SUBSCRIPTIONS_ENABLED=true (run locally against prod or staging).
 *
 * Usage:
 *   BASE_URL=https://carsi.com.au node scripts/verify-go-live-readiness.mjs
 */
import { pathToFileURL } from 'node:url';

const base = (process.env.BASE_URL ?? 'https://carsi.com.au').replace(/\/$/, '');

const checks = [];

/**
 * Classify the subscription-checkout probe.
 *
 * The old assertion was `status !== 200 && !body.url`, which cannot tell a refusal from an
 * infrastructure failure. Run against production it received HTTP 504 with an HTML body in 92 ms
 * — DigitalOcean's edge rewriting the origin's 503 — and reported the gate GREEN. A 504 means the
 * request never reached the application, so it is evidence of nothing, and this is the check that
 * has to hold both BEFORE and AFTER the SUBSCRIPTIONS_ENABLED flip. Blind at exactly the moment
 * it matters is the worst property a revenue gate can have.
 *
 * Three outcomes, and only one of them is a pass:
 *   - refused   — the application answered and declined to open a checkout. Pass.
 *   - open      — a checkout session was created without a signed-in user. Fail, loudly.
 *   - unknown   — an edge/gateway error, or a non-JSON body. Fail, because it proves nothing.
 *
 * Statuses that count as a refusal: 401/403 (no session — the expected answer once the flag is
 * on) and 503 (the deliberate fail-closed answer while the flag is off). A 503 is only accepted
 * as a refusal when the body is JSON: the edge emits HTML, the application emits JSON, and that
 * is what separates "the app refused" from "the platform broke".
 */
const REFUSAL_STATUSES = new Set([401, 403, 503]);

export function classifyCheckoutProbe({ status, contentType, body, originStatus }) {
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    json = null;
  }

  // DigitalOcean App Platform reports the status it received from the application in
  // `x-do-orig-status` before rewriting it for the client. Measured on production: the checkout
  // endpoint answers 503 (its deliberate fail-closed branch) and the edge serves the client a 504
  // HTML page carrying `x-do-orig-status: 503`. When that header is present it is direct evidence
  // of what the application actually answered, so classify on it and see through the rewrite —
  // the gate stays conclusive instead of being defeated by infrastructure.
  const origin = Number.parseInt(String(originStatus ?? ''), 10);
  if (Number.isFinite(origin) && origin > 0 && origin !== status) {
    if (origin === 200) {
      return {
        verdict: 'open',
        detail: `origin answered HTTP 200 (edge served ${status}) — checkout is NOT failing closed`,
      };
    }
    if (REFUSAL_STATUSES.has(origin)) {
      return {
        verdict: 'refused',
        detail: `origin answered HTTP ${origin} (edge rewrote it to ${status}) — the application refused to open a checkout`,
      };
    }
    return {
      verdict: 'unknown',
      detail: `origin answered HTTP ${origin} (edge served ${status}), which is neither a recognised refusal (${[...REFUSAL_STATUSES].join('/')}) nor an open checkout.`,
    };
  }

  if (status === 200 || (json && typeof json.url === 'string' && json.url)) {
    return {
      verdict: 'open',
      detail: `HTTP ${status} and a checkout session was returned — checkout is NOT failing closed`,
    };
  }

  const looksHtml = /text\/html/i.test(contentType ?? '') || /^\s*(<!DOCTYPE|<html)/i.test(body ?? '');
  if (looksHtml) {
    return {
      verdict: 'unknown',
      detail: `HTTP ${status} with an HTML body — an edge/gateway response, so the request never reached the application. This proves nothing about fail-closed behaviour.`,
    };
  }

  if (json === null) {
    return {
      verdict: 'unknown',
      detail: `HTTP ${status} with a non-JSON body — cannot confirm the application answered.`,
    };
  }

  if (REFUSAL_STATUSES.has(status)) {
    return {
      verdict: 'refused',
      detail: `HTTP ${status} with a JSON body — the application refused to open a checkout`,
    };
  }

  return {
    verdict: 'unknown',
    detail: `HTTP ${status} is neither a recognised refusal (${[...REFUSAL_STATUSES].join('/')}) nor an open checkout — treat as inconclusive.`,
  };
}

async function get(path) {
  const res = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function main() {
  const pricing = await fetch(`${base}/pricing`, { headers: { Accept: 'text/html' } });
  checks.push({
    name: 'Pricing page reachable',
    pass: pricing.ok,
    detail: `HTTP ${pricing.status}`,
  });

  const subStatus = await get('/api/lms/subscription/status');
  checks.push({
    name: 'Subscription status API (fail-closed default)',
    pass: subStatus.ok && subStatus.json?.has_subscription === false,
    detail: JSON.stringify(subStatus.json ?? subStatus.status),
  });

  const dirHealth = await get('/api/health/professional-directory');
  checks.push({
    name: 'Professional directory health',
    pass: dirHealth.ok && dirHealth.json?.listingCount === 0,
    detail: JSON.stringify(dirHealth.json ?? dirHealth.status),
  });

  const checkout = await fetch(`${base}/api/lms/subscription/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: '{}',
  });
  const checkoutProbe = classifyCheckoutProbe({
    status: checkout.status,
    contentType: checkout.headers.get('content-type'),
    originStatus: checkout.headers.get('x-do-orig-status'),
    body: await checkout.text().catch(() => ''),
  });
  checks.push({
    name: 'Checkout refuses to open a session without a signed-in user',
    pass: checkoutProbe.verdict === 'refused',
    detail: checkoutProbe.detail,
  });

  let failed = 0;
  for (const c of checks) {
    const mark = c.pass ? 'OK' : 'FAIL';
    if (!c.pass) failed += 1;
    console.log(`${mark}: ${c.name} — ${c.detail}`);
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed. Fix before flipping SUBSCRIPTIONS_ENABLED.`);
    process.exit(1);
  }
  console.log('\nAll automated pre-flight checks passed.');
  console.log('Manual steps remain: create Stripe Prices, run Test Clock checklist, set DO env vars.');
}

// CLI only — importing this module for the self-test must not fire network probes or exit.
// pathToFileURL, never `file://` + the raw path: the string-concatenated form leaves spaces
// unencoded and silently evaluates false on any checkout path containing one, which is how the
// IICRC terminology guard came to pass vacuously for months.
const isCli = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(1);
});
