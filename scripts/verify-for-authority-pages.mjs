#!/usr/bin/env node
/**
 * GP-661 — read-only smoke for the six /role-guides/<role> authority guides.
 *
 * Usage:
 *   node scripts/verify-for-authority-pages.mjs
 *   FOR_AUTHORITY_BASE=https://carsi.com.au node scripts/verify-for-authority-pages.mjs
 */
const BASE = (process.env.FOR_AUTHORITY_BASE ?? 'https://carsi.com.au').replace(/\/$/, '');

const SLUGS = [
  'nsw-builders',
  'insurance-claims-staff',
  'facility-managers',
  'healthcare-facilities',
  'property-and-strata-managers',
  'commercial-cleaning-contractors',
];

async function checkPath(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { headers: { Accept: 'text/html' } });
  const html = await res.text();
  return { url, status: res.status, html };
}

async function main() {
  const hub = await checkPath('/role-guides');
  if (hub.status !== 200) {
    console.error(`FAIL: ${hub.url} returned HTTP ${hub.status}`);
    process.exit(1);
  }
  if (!/Role-specific training guides|Training guides written for the role/i.test(hub.html)) {
    console.error(`FAIL: ${hub.url} missing expected hub heading`);
    process.exit(1);
  }

  let ok = 0;
  for (const slug of SLUGS) {
    const { url, status, html } = await checkPath(`/role-guides/${slug}`);
    if (status !== 200) {
      console.error(`FAIL: ${url} returned HTTP ${status}`);
      process.exit(1);
    }
    if (!/<h1/i.test(html)) {
      console.error(`FAIL: ${url} missing h1`);
      process.exit(1);
    }
    if (!/\/images\/for\/[a-z0-9-]+\.webp/i.test(html)) {
      console.error(`FAIL: ${url} missing committed /images/for/ hero`);
      process.exit(1);
    }
    if (!/Preview page|noindex|Draft/i.test(html) && !/Live courses linked below/i.test(html)) {
      console.error(`FAIL: ${url} missing expected guide markers`);
      process.exit(1);
    }
    if (/Phill approves/i.test(html)) {
      console.error(`FAIL: ${url} still shows internal-only draft copy`);
      process.exit(1);
    }
    ok += 1;
    console.log(`OK: ${url}`);
  }

  console.log(`OK: hub ${hub.url} and ${ok} role guides`);
}

main().catch((error) => {
  console.error('FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
