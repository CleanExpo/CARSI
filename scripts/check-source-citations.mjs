#!/usr/bin/env node
/**
 * Source-citation scorecard — the machine-checkable half of E-E-A-T.
 *
 * Google's E-E-A-T rewards demonstrated Experience and Expertise. For a training provider that
 * means content grounded in primary regulators and standards bodies, not in supplier catalogues.
 * This script measures which one CARSI is actually doing, per surface, against
 * data/seed/source-registry.json.
 *
 * It reports three things a human cannot eyeball across 37 courses:
 *   1. authority ratio  — tier-1/2 citations as a share of all real citations
 *   2. unvetted domains — cited but absent from the registry (not banned; unreviewed)
 *   3. supplier-only surfaces — content whose every citation is a vendor
 *
 * Asset hosts (CDNs, image stores, the CARSI domain itself) are excluded so an image-heavy
 * lesson is not scored as though it cited a source.
 *
 * ADVISORY by default (exit 0), matching check-course-completeness. Pass --enforce to fail on
 * unvetted domains once the registry is settled.
 *
 * Usage: node scripts/check-source-citations.mjs [--enforce] [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const REGISTRY = 'data/seed/source-registry.json';
const SCAN_DIRS = ['data/seed', 'docs/course-content', 'docs/marketing', 'docs/content'];
const SCAN_EXT = new Set(['.json', '.md', '.txt']);
const URL_RE = /https?:\/\/([a-zA-Z0-9.-]+\.[a-z]{2,})/g;

const enforce = process.argv.includes('--enforce');
const asJson = process.argv.includes('--json');

const reg = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const tierOf = new Map(reg.sources.map((s) => [s.domain.toLowerCase(), s.tier]));
const assetHosts = new Set(reg.assetHosts.domains.map((d) => d.toLowerCase()));

/** Strip a leading www. and match a registry entry or any of its subdomains. */
function classify(host) {
  const h = host.toLowerCase().replace(/^www\./, '');
  if (assetHosts.has(h) || [...assetHosts].some((a) => h.endsWith(`.${a}`))) return 'asset';
  if (tierOf.has(h)) return tierOf.get(h);
  for (const [d, t] of tierOf) if (h.endsWith(`.${d}`)) return t;
  return 'unvetted';
}

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (SCAN_EXT.has(extname(p))) out.push(p);
  }
  return out;
}

const byTier = { 1: 0, 2: 0, 3: 0, 4: 0 };
const unvetted = new Map();
const supplierOnlyFiles = [];
let totalReal = 0;

for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
  const text = readFileSync(file, 'utf8');
  const local = { 1: 0, 2: 0, 3: 0, 4: 0, unvetted: 0 };
  for (const m of text.matchAll(URL_RE)) {
    const c = classify(m[1]);
    if (c === 'asset') continue;
    if (c === 'unvetted') {
      local.unvetted++;
      const h = m[1].toLowerCase().replace(/^www\./, '');
      unvetted.set(h, (unvetted.get(h) ?? 0) + 1);
      continue;
    }
    local[c]++; byTier[c]++; totalReal++;
  }
  const authoritative = local[1] + local[2];
  const cited = authoritative + local[3] + local[4];
  if (cited > 0 && authoritative === 0 && local[4] > 0) supplierOnlyFiles.push({ file, supplier: local[4] });
}

const authoritative = byTier[1] + byTier[2];
const ratio = totalReal === 0 ? 0 : Math.round((authoritative / totalReal) * 100);

if (asJson) {
  console.log(JSON.stringify({ byTier, authorityRatio: ratio, unvetted: [...unvetted], supplierOnlyFiles }, null, 2));
} else {
  console.log('\nCARSI source-citation scorecard\n');
  console.log(`  tier 1 primary regulator/standards   ${byTier[1]}`);
  console.log(`  tier 2 peer-reviewed / health body   ${byTier[2]}`);
  console.log(`  tier 3 industry body (nominative)    ${byTier[3]}`);
  console.log(`  tier 4 supplier / product            ${byTier[4]}`);
  console.log(`\n  AUTHORITY RATIO (tier 1+2 of all cited): ${ratio}%`);
  if (supplierOnlyFiles.length) {
    console.log(`\n  Supplier-only surfaces (cite vendors, zero authority): ${supplierOnlyFiles.length}`);
    for (const s of supplierOnlyFiles.slice(0, 10)) console.log(`    ${s.file} (${s.supplier} supplier citation(s))`);
  }
  if (unvetted.size) {
    console.log(`\n  Unvetted domains (cited, not in registry) — review and tier, or replace:`);
    for (const [d, n] of [...unvetted].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`    ${String(n).padStart(4)}  ${d}`);
  }
  console.log(
    unvetted.size === 0
      ? '\n  ✓ every cited domain is registered.\n'
      : `\n  (advisory — pass --enforce to fail CI on unvetted domains)\n`
  );
}

if (enforce && unvetted.size > 0) process.exit(1);
