#!/usr/bin/env node
/**
 * GP-567 D1 — Reconciled catalogue inventory.
 *
 * Three sources, measured not assumed:
 *   live    = carsi.com.au sitemap.xml /courses/ URLs, cross-checked against the
 *             JSON-LD ItemList on /courses
 *   legacy  = data/wordpress-export/courses.json
 *   seed    = data/seed/courses-catalog.json (.courses)
 *
 * Every course row carries exactly one reconciliation status, derived from the
 * presence triple. Writes docs/audit/inventory.json and inventory.md.
 *
 * Live input is read from the .audit-cache/ snapshot so the reconciliation is
 * reproducible; refresh it with scripts/audit/fetch-live.sh.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CACHE = path.join(ROOT, '.audit-cache');
const OUT_DIR = path.join(ROOT, 'docs', 'audit');

function readCache(name) {
  const p = path.join(CACHE, name);
  if (!fs.existsSync(p)) {
    console.error(`FAIL: missing live snapshot ${p} — run scripts/audit/fetch-live.sh`);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

// ---- live ---------------------------------------------------------------
const sitemap = readCache('sitemap.xml');
const liveSlugs = [
  ...new Set(
    [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)]
      .map((m) => m[1])
      .filter((u) => u.includes('/courses/'))
      .map((u) => u.split('/courses/')[1].replace(/\/$/, ''))
      .filter(Boolean),
  ),
].sort();

const html = readCache('courses.html');
const ldBlocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => {
    try {
      return JSON.parse(m[1].trim());
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const itemList = ldBlocks.flat().find((o) => o && o['@type'] === 'ItemList');
const ldCourses = new Map();
if (itemList) {
  for (const el of itemList.itemListElement || []) {
    const item = el.item || el;
    const url = item.url || item['@id'] || '';
    const slug = url.includes('/courses/') ? url.split('/courses/')[1].replace(/\/$/, '') : null;
    if (slug) {
      ldCourses.set(slug, {
        name: item.name ?? null,
        description: item.description ?? null,
        price: item.offers?.price ?? null,
        currency: item.offers?.priceCurrency ?? null,
        availability: item.offers?.availability ?? null,
        courseMode: item.courseMode ?? null,
        courseWorkload: item.hasCourseInstance?.courseWorkload ?? item.courseWorkload ?? null,
      });
    }
  }
}

// ---- legacy -------------------------------------------------------------
const wpRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/wordpress-export/courses.json'), 'utf8'));
const legacy = Array.isArray(wpRaw) ? wpRaw : wpRaw.courses || [];
const legacyBySlug = new Map(legacy.map((c) => [c.slug, c]));

// ---- seed ---------------------------------------------------------------
const seedRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/seed/courses-catalog.json'), 'utf8'));
const seed = Array.isArray(seedRaw) ? seedRaw : seedRaw.courses || [];
const seedBySlug = new Map(seed.map((c) => [c.slug, c]));

// ---- reconcile ----------------------------------------------------------
const STATUS = {
  '111': 'ALL_THREE',
  '110': 'LIVE_AND_LEGACY_NOT_SEEDED',
  '101': 'LIVE_AND_SEED_NOT_IN_LEGACY',
  '100': 'LIVE_ONLY',
  '011': 'LEGACY_AND_SEED_NOT_LIVE',
  '010': 'LEGACY_ONLY_PARITY_GAP',
  '001': 'SEED_ONLY_NOT_LIVE',
};

const allSlugs = [...new Set([...liveSlugs, ...legacyBySlug.keys(), ...seedBySlug.keys()])].sort();

const rows = allSlugs.map((slug) => {
  const l = liveSlugs.includes(slug);
  const g = legacyBySlug.has(slug);
  const s = seedBySlug.has(slug);
  const key = `${l ? 1 : 0}${g ? 1 : 0}${s ? 1 : 0}`;
  const lg = legacyBySlug.get(slug);
  const sd = seedBySlug.get(slug);
  return {
    slug,
    status: STATUS[key],
    present: { live: l, legacy: g, seed: s },
    title: ldCourses.get(slug)?.name ?? lg?.title ?? sd?.title ?? null,
    legacy_status: lg?.status ?? null,
    legacy_cec_hours: lg?.cec_hours ?? null,
    legacy_iicrc_discipline: lg?.iicrc_discipline ?? null,
    seed_cec_hours: sd?.cecHours ?? null,
    seed_iicrc_discipline: sd?.iicrcDiscipline ?? null,
    live_price: ldCourses.get(slug)?.price ?? null,
    live_currency: ldCourses.get(slug)?.currency ?? null,
  };
});

const counts = rows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});

const inventory = {
  schema: 'gp567-inventory/1',
  generated_at_utc: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  generated_by: 'scripts/audit/build-inventory.mjs',
  live_snapshot_access_date: fs.statSync(path.join(CACHE, 'sitemap.xml')).mtime.toISOString().slice(0, 10),
  source_counts_observed: {
    live_sitemap_course_urls: liveSlugs.length,
    live_jsonld_itemlist_entries: ldCourses.size,
    legacy_wordpress_export_records: legacy.length,
    legacy_published: legacy.filter((c) => c.status === 'published').length,
    seed_catalog_courses: seed.length,
    total_distinct_slugs: allSlugs.length,
  },
  card_claimed_counts_UNOBSERVED: {
    note: 'GP-567 states "93 planned / 5 seeded" and "31 parity gaps". Recorded verbatim; NOT reproduced by this run. Do not treat as verified.',
    planned: 93,
    seeded: 5,
    parity_gaps: 31,
  },
  status_counts: counts,
  rows,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);

// ---- markdown -----------------------------------------------------------
const md = [];
md.push('# GP-567 D1 — Reconciled catalogue inventory');
md.push('');
md.push(`Generated \`${inventory.generated_at_utc}\` by \`scripts/audit/build-inventory.mjs\`.`);
md.push(`Live snapshot access date: **${inventory.live_snapshot_access_date}** (\`.audit-cache/\`).`);
md.push('');
md.push('## Source counts — observed this run');
md.push('');
md.push('| Source | Count |');
md.push('| --- | ---: |');
for (const [k, v] of Object.entries(inventory.source_counts_observed)) {
  md.push(`| \`${k}\` | ${v} |`);
}
md.push('');
md.push('## Counts the card claims — NOT reproduced');
md.push('');
md.push('GP-567 states **93 planned / 5 seeded** and **31 parity gaps**. This run observed');
md.push(`**${inventory.source_counts_observed.seed_catalog_courses} seed courses** and`);
md.push(`**${counts.LEGACY_ONLY_PARITY_GAP || 0} legacy-only parity gaps**. The card's figures are`);
md.push('recorded as UNOBSERVED and must not be cited as verified until reconciled.');
md.push('');
md.push('## Reconciliation status counts');
md.push('');
md.push('| Status | Count | Meaning |');
md.push('| --- | ---: | --- |');
const MEAN = {
  ALL_THREE: 'Live, in the WordPress legacy, and in the repo seed',
  LIVE_AND_LEGACY_NOT_SEEDED: 'Live and in legacy, but absent from the repo seed catalogue',
  LIVE_AND_SEED_NOT_IN_LEGACY: 'Live and seeded, no legacy record',
  LIVE_ONLY: 'Live with no local source record at all',
  LEGACY_AND_SEED_NOT_LIVE: 'Known locally but not published live',
  LEGACY_ONLY_PARITY_GAP: 'In the WordPress legacy only — the parity-gap class',
  SEED_ONLY_NOT_LIVE: 'In the repo seed only — not live, no legacy record',
};
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  md.push(`| \`${k}\` | ${v} | ${MEAN[k] || ''} |`);
}
md.push('');
md.push(`**Total distinct courses across all three sources: ${allSlugs.length}.**`);
md.push('');
md.push('## Every course, one status each');
md.push('');
md.push('| Slug | Status | Legacy CEC hrs | Legacy IICRC discipline | Seed CEC hrs |');
md.push('| --- | --- | ---: | --- | ---: |');
for (const r of rows) {
  md.push(
    `| \`${r.slug}\` | ${r.status} | ${r.legacy_cec_hours ?? '—'} | ${r.legacy_iicrc_discipline ?? '—'} | ${r.seed_cec_hours ?? '—'} |`,
  );
}
md.push('');
fs.writeFileSync(path.join(OUT_DIR, 'inventory.md'), `${md.join('\n')}\n`);

console.log(JSON.stringify({ ok: true, ...inventory.source_counts_observed, status_counts: counts }, null, 2));
