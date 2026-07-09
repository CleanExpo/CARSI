#!/usr/bin/env node
/**
 * Pre-flip checklist for SUBSCRIPTIONS_ENABLED=true (run locally against prod or staging).
 *
 * Usage:
 *   BASE_URL=https://carsi.com.au node scripts/verify-go-live-readiness.mjs
 */
const base = (process.env.BASE_URL ?? 'https://carsi.com.au').replace(/\/$/, '');

const checks = [];

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
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const checkoutBody = await checkout.json().catch(() => ({}));
  checks.push({
    name: 'Checkout fails closed without session (not 200)',
    pass: checkout.status !== 200 && !checkoutBody.url,
    detail: `HTTP ${checkout.status}`,
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

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(1);
});
