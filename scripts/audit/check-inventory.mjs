#!/usr/bin/env node
/** GP-567 c1 verifier — inventory exists, reconciles three sources, one status per row. */
import fs from 'node:fs';

const fail = (m) => {
  console.error(`FAIL c1: ${m}`);
  process.exit(1);
};

for (const f of ['docs/audit/inventory.json', 'docs/audit/inventory.md']) {
  if (!fs.existsSync(f)) fail(`missing ${f}`);
}

const inv = JSON.parse(fs.readFileSync('docs/audit/inventory.json', 'utf8'));
const VALID = new Set([
  'ALL_THREE', 'LIVE_AND_LEGACY_NOT_SEEDED', 'LIVE_AND_SEED_NOT_IN_LEGACY', 'LIVE_ONLY',
  'LEGACY_AND_SEED_NOT_LIVE', 'LEGACY_ONLY_PARITY_GAP', 'SEED_ONLY_NOT_LIVE',
]);

if (!Array.isArray(inv.rows) || inv.rows.length === 0) fail('inventory has no rows');

for (const r of inv.rows) {
  if (!r.slug) fail('a row has no slug');
  if (!VALID.has(r.status)) fail(`row ${r.slug} has invalid status "${r.status}"`);
  const p = r.present || {};
  const key = `${p.live ? 1 : 0}${p.legacy ? 1 : 0}${p.seed ? 1 : 0}`;
  if (key === '000') fail(`row ${r.slug} is present in no source`);
}

const c = inv.source_counts_observed || {};
for (const k of ['live_sitemap_course_urls', 'legacy_wordpress_export_records', 'seed_catalog_courses']) {
  if (typeof c[k] !== 'number') fail(`source_counts_observed.${k} is not an observed number`);
}
if (!inv.card_claimed_counts_UNOBSERVED) {
  fail('the card\'s own figures must be recorded as UNOBSERVED, not silently reconciled');
}

console.log(`OK c1: ${inv.rows.length} rows, one status each; 3 source counts observed`);
