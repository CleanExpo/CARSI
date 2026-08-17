#!/usr/bin/env node
/**
 * Self-test for the subscription-checkout probe in verify-go-live-readiness.mjs.
 *
 * This is the check that gates the SUBSCRIPTIONS_ENABLED flip — the revenue switch — and it has
 * to hold both before and after. Its previous assertion (`status !== 200 && !body.url`) passed on
 * ANY non-200, including a DigitalOcean 504 that never reached the application. Measured against
 * production on 2026-08-18 it reported the whole gate green off a 504 with an HTML body returned
 * in 92 ms.
 *
 * The first case below is that exact production response. It must FAIL now.
 *
 *   node scripts/verify-go-live-readiness.test.mjs
 */
import { classifyCheckoutProbe } from './verify-go-live-readiness.mjs';

const HTML_504 = `      <!DOCTYPE html>
      <html>
      <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="robots" content="noindex">
      </head>
      <body><p>504 Gateway Timeout</p></body>
      </html>`;

const CASES = [
  // The regression this rewrite exists for, WITHOUT the origin header: nothing can be concluded.
  {
    name: 'DigitalOcean 504 HTML — the exact live response that used to pass the gate',
    probe: { status: 504, contentType: 'text/html', body: HTML_504 },
    expect: 'unknown',
  },
  // The same rewrite WITH the header production actually sends. `x-do-orig-status: 503` is direct
  // evidence that the application answered with its fail-closed branch, so the gate can see
  // through the edge rewrite and stay conclusive rather than being defeated by infrastructure.
  {
    name: 'DO 504 carrying x-do-orig-status: 503 — the real production response',
    probe: { status: 504, contentType: 'text/html', body: HTML_504, originStatus: '503' },
    expect: 'refused',
  },
  // The case that must never be laundered by the rewrite: the app opened a checkout and the edge
  // happened to fail afterwards. A gateway error must not hide an open checkout.
  {
    name: 'DO 504 hiding an origin 200 — an open checkout behind a gateway error',
    probe: { status: 504, contentType: 'text/html', body: HTML_504, originStatus: '200' },
    expect: 'open',
  },
  {
    name: 'DO 502 carrying an origin 401',
    probe: { status: 502, contentType: 'text/html', body: '<html>502</html>', originStatus: '401' },
    expect: 'refused',
  },
  {
    name: 'DO 504 carrying an unrecognised origin status',
    probe: { status: 504, contentType: 'text/html', body: HTML_504, originStatus: '500' },
    expect: 'unknown',
  },
  {
    name: '502 gateway HTML',
    probe: { status: 502, contentType: 'text/html; charset=utf-8', body: '<html><body>502</body></html>' },
    expect: 'unknown',
  },
  // An edge 503 wearing the same status code as the application's deliberate refusal. The body
  // is what separates them, which is why content type alone is not enough.
  {
    name: 'edge 503 with an HTML body is NOT the app refusing',
    probe: { status: 503, contentType: 'text/html', body: '<!DOCTYPE html><html>503</html>' },
    expect: 'unknown',
  },
  // Genuine refusals — the application answered.
  {
    name: 'app 503 with JSON — deliberate fail-closed while the flag is off',
    probe: { status: 503, contentType: 'application/json', body: '{"error":"subscriptions_disabled"}' },
    expect: 'refused',
  },
  {
    name: 'app 401 with JSON — no session, the expected answer once the flag is on',
    probe: { status: 401, contentType: 'application/json', body: '{"error":"unauthenticated"}' },
    expect: 'refused',
  },
  {
    name: 'app 403 with JSON',
    probe: { status: 403, contentType: 'application/json', body: '{"error":"forbidden"}' },
    expect: 'refused',
  },
  // The failure the gate exists to catch: an anonymous caller got a checkout session.
  {
    name: '200 with a Stripe checkout URL — checkout is open to anonymous callers',
    probe: { status: 200, contentType: 'application/json', body: '{"url":"https://checkout.stripe.com/c/pay/cs_test_123"}' },
    expect: 'open',
  },
  {
    name: 'non-200 that still returns a checkout URL',
    probe: { status: 201, contentType: 'application/json', body: '{"url":"https://checkout.stripe.com/c/pay/cs_test_456"}' },
    expect: 'open',
  },
  // Anything unrecognised is inconclusive, never a pass.
  {
    name: '500 with JSON is not a recognised refusal',
    probe: { status: 500, contentType: 'application/json', body: '{"error":"boom"}' },
    expect: 'unknown',
  },
  {
    name: 'empty body',
    probe: { status: 503, contentType: '', body: '' },
    expect: 'unknown',
  },
];

let failed = 0;
for (const c of CASES) {
  const got = classifyCheckoutProbe(c.probe);
  if (got.verdict !== c.expect) {
    console.error(`✖ ${c.name}\n    expected ${c.expect}, got ${got.verdict} — ${got.detail}`);
    failed += 1;
  }
}

// The gate passes on exactly one verdict. If that ever widens, this fails.
const passing = CASES.filter((c) => classifyCheckoutProbe(c.probe).verdict === 'refused');
if (passing.length !== 5) {
  console.error(`✖ expected exactly 5 refusal cases to pass the gate, got ${passing.length}`);
  failed += 1;
}

if (failed > 0) {
  console.error(`\n✖ go-live readiness self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(`✓ go-live readiness self-test passed (${CASES.length} cases).`);
