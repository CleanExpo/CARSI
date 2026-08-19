#!/usr/bin/env node
/**
 * Non-vacuity proof for the source-citation scorecard.
 *
 * The scorecard is the machine-checkable half of E-E-A-T: it measures whether course content is
 * grounded in primary regulators or in supplier catalogues. A classifier that silently mis-tiers
 * a domain would report a flattering authority ratio while the content got worse — the same
 * failure mode as the completeness bar that manufactured an intro-video pass.
 *
 * Guards the classification itself, since that is where a wrong answer is invisible.
 */
import { readFileSync } from 'node:fs';

const reg = JSON.parse(readFileSync('data/seed/source-registry.json', 'utf8'));
const tierOf = new Map(reg.sources.map((s) => [s.domain.toLowerCase(), s.tier]));
const assetHosts = new Set(reg.assetHosts.domains.map((d) => d.toLowerCase()));

/** Mirrors classify() in check-source-citations.mjs. */
function classify(host) {
  const h = host.toLowerCase().replace(/^www\./, '');
  if (assetHosts.has(h) || [...assetHosts].some((a) => h.endsWith(`.${a}`))) return 'asset';
  if (tierOf.has(h)) return tierOf.get(h);
  for (const [d, t] of tierOf) if (h.endsWith(`.${d}`)) return t;
  return 'unvetted';
}

const CASES = [
  // Primary regulators must be tier 1 — these carry a safety or compliance claim.
  ['safeworkaustralia.gov.au', 1],
  ['www.safeworkaustralia.gov.au', 1],
  ['legislation.gov.au', 1],
  ['standards.org.au', 1],
  ['epa.nsw.gov.au', 1],
  ['epa.vic.gov.au', 1],
  ['worksafe.vic.gov.au', 1],
  // Suppliers must be tier 4 — citable for product spec, NEVER evidence for a safety claim.
  ['hydramaster.com', 4],
  ['actichem.com.au', 4],
  ['ccwonline.com.au', 4],
  // The IICRC is nominative-only. Mis-tiering it upward would let their standards look like a
  // permitted source, which their AI Use Policy forbids.
  ['iicrc.org', 3],
  // Asset hosts must never score — an image-heavy lesson is not a well-sourced one.
  ['cdn.shopify.com', 'asset'],
  ['res.cloudinary.com', 'asset'],
  ['carsi.com.au', 'asset'],
  // Unknown domains are unvetted, not silently trusted.
  ['some-random-blog.example', 'unvetted'],
  ['chatgpt.com', 'unvetted'],
];

let failed = 0;
for (const [host, expected] of CASES) {
  const got = classify(host);
  if (got !== expected) {
    console.error(`✖ ${host}: expected ${expected}, got ${got}`);
    failed++;
  }
}

// A supplier must never be counted as authoritative — the ratio is the whole point.
const authoritative = (h) => [1, 2].includes(classify(h));
for (const h of ['hydramaster.com', 'ccwonline.com.au', 'actichem.com.au']) {
  if (authoritative(h)) {
    console.error(`✖ supplier ${h} counted toward the authority ratio`);
    failed++;
  }
}
if (!authoritative('safeworkaustralia.gov.au')) {
  console.error('✖ Safe Work Australia NOT counted toward the authority ratio');
  failed++;
}

// The registry must carry the licence rule in data, not only in prose.
if (!/nominative/i.test(JSON.stringify(reg.rules) + JSON.stringify(reg.sources))) {
  console.error('✖ registry no longer records the IICRC nominative-only rule');
  failed++;
}

if (failed > 0) {
  console.error(`\n✖ Source-citation scorecard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(`✓ Source-citation scorecard self-test passed (${CASES.length} classifications).`);
process.exit(0);
