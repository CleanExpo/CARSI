#!/usr/bin/env node
/**
 * GP-567 D1b — separate slug DRIFT from genuine parity gaps.
 *
 * Exact-slug matching alone reports 78 legacy-only courses. That number is an
 * artefact: the WordPress -> platform migration renamed slugs. Counting it as
 * "78 missing courses" would be exactly the kind of false finding this audit
 * exists to prevent, so every legacy record is tested against three matchers in
 * decreasing confidence, and only what survives all three is a parity gap.
 *
 *   1. exact normalised slug against live or seed
 *   2. exact normalised TITLE against a seed course
 *   3. token-overlap >= THRESHOLD against a live slug (recorded with its score,
 *      because this one is a judgement call, not a proof)
 *
 * Writes docs/audit/parity-analysis.json.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const THRESHOLD = 0.6;

const wp = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/wordpress-export/courses.json'), 'utf8'));
const legacy = Array.isArray(wp) ? wp : wp.courses || [];
const seedRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/seed/courses-catalog.json'), 'utf8'));
const seed = seedRaw.courses || [];
const sitemap = fs.readFileSync(path.join(ROOT, '.audit-cache/sitemap.xml'), 'utf8');
const live = [
  ...new Set(
    [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)]
      .map((m) => m[1])
      .filter((u) => u.includes('/courses/'))
      .map((u) => u.split('/courses/')[1].replace(/\/$/, ''))
      .filter(Boolean),
  ),
];

const STOP = new Set(['the', 'a', 'an', 'for', 'of', 'and', 'to', 'in', 'with']);
const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && !STOP.has(t))
    .join(' ')
    .trim();

const liveNorm = new Set(live.map(norm));
const seedSlugNorm = new Set(seed.map((c) => norm(c.slug)));
const seedTitleNorm = new Map(seed.map((c) => [norm(c.title), c.slug]));
const liveTokens = live.map((l) => [l, new Set(norm(l).split(' ').filter((t) => t.length > 3))]);

const matched = { exact_slug: [], seed_title: [], token_overlap: [] };
const gaps = [];

for (const c of legacy) {
  const ns = norm(c.slug);
  const nt = norm(c.title);
  if (liveNorm.has(ns) || seedSlugNorm.has(ns)) {
    matched.exact_slug.push(c.slug);
    continue;
  }
  if (seedTitleNorm.has(nt)) {
    matched.seed_title.push({ legacy_slug: c.slug, seed_slug: seedTitleNorm.get(nt) });
    continue;
  }
  const toks = new Set(nt.split(' ').filter((t) => t.length > 3));
  let best = 0;
  let bestSlug = null;
  for (const [l, lt] of liveTokens) {
    const inter = [...toks].filter((t) => lt.has(t)).length;
    const score = inter / Math.max(1, Math.min(toks.size, lt.size));
    if (score > best) {
      best = score;
      bestSlug = l;
    }
  }
  if (best >= THRESHOLD) {
    matched.token_overlap.push({ legacy_slug: c.slug, live_slug: bestSlug, score: Number(best.toFixed(2)) });
    continue;
  }
  gaps.push({
    slug: c.slug,
    title: c.title,
    legacy_status: c.status,
    cec_hours: c.cec_hours ?? null,
    iicrc_discipline: c.iicrc_discipline ?? null,
    nearest_live_slug: bestSlug,
    nearest_score: Number(best.toFixed(2)),
  });
}

const out = {
  schema: 'gp567-parity/1',
  generated_at_utc: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  method: {
    note: 'Exact-slug matching alone reports every renamed course as missing. Three matchers, decreasing confidence; only records surviving all three are parity gaps.',
    token_overlap_threshold: THRESHOLD,
    caveat:
      'Matcher 3 is a heuristic, not a proof. Its matches are listed individually with scores so a reviewer can overturn any one of them.',
  },
  legacy_total: legacy.length,
  matched_counts: {
    exact_slug: matched.exact_slug.length,
    seed_title: matched.seed_title.length,
    token_overlap: matched.token_overlap.length,
  },
  parity_gap_count: gaps.length,
  parity_gap_published: gaps.filter((g) => g.legacy_status === 'published').length,
  parity_gap_draft: gaps.filter((g) => g.legacy_status === 'draft').length,
  card_claimed_parity_gaps_UNOBSERVED: 31,
  matched,
  parity_gaps: gaps,
};

fs.mkdirSync(path.join(ROOT, 'docs/audit'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audit/parity-analysis.json'), `${JSON.stringify(out, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      legacy_total: out.legacy_total,
      matched_counts: out.matched_counts,
      parity_gap_count: out.parity_gap_count,
      published: out.parity_gap_published,
      draft: out.parity_gap_draft,
      card_claims: 31,
    },
    null,
    2,
  ),
);
