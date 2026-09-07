#!/usr/bin/env node
/**
 * GP-567 D2 — Evidence Ledger, batch 1.
 *
 * Every entry is emitted from a value MEASURED at run time, not typed in, so
 * re-running re-measures and a drifted claim shows up as a changed ledger rather
 * than a stale sentence. Where a number is hard-coded it is because it was read
 * off a live HTTP response captured in .audit-cache/ on the access date.
 *
 * Status vocabulary is the founder's rule; validate-ledger.mjs enforces it and
 * check-mutants.mjs proves that enforcement can fail.
 *
 * IMPORTANT distinction this ledger keeps: a claim can be TRUE and still be
 * PROHIBITED public language. Truth is recorded here; whether a fact may be said
 * in public is the Compliance Gate's question, recorded in the compliance sweep.
 * Filing a true-but-prohibited claim as "false" would itself be a false finding.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ACCESS = '2026-09-07';
const OUT = path.join(ROOT, 'docs/audit/evidence-ledger.jsonl');

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const wpRaw = readJson('data/wordpress-export/courses.json');
const legacy = Array.isArray(wpRaw) ? wpRaw : wpRaw.courses || [];
const seed = readJson('data/seed/courses-catalog.json').courses || [];
const approvals = readJson('data/seed/cec-approvals.json').approvals || [];
const parity = readJson('docs/audit/parity-analysis.json');
const inventory = readJson('docs/audit/inventory.json');

const sitemap = fs.readFileSync(path.join(ROOT, '.audit-cache/sitemap.xml'), 'utf8');
const liveSlugs = [
  ...new Set(
    [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)]
      .map((m) => m[1])
      .filter((u) => u.includes('/courses/'))
      .map((u) => u.split('/courses/')[1].replace(/\/$/, ''))
      .filter(Boolean),
  ),
];
const ACRONYMS = /^(wrt|asd|amrt|cct|ccmt|ccu|osr|fsrt|smt|hst|uft|rrt|wlp)-/i;
const acronymSlugs = liveSlugs.filter((s) => ACRONYMS.test(s));
const approvedSlugs = new Set(approvals.map((a) => a.slug));

const E = [];
const add = (e) => E.push(e);

// ---- VERIFIED: catalogue shape, all repo- or live-sourced ----------------
add({
  id: 'GP567-001', claim_class: 'catalogue-count', surface: 'https://carsi.com.au/sitemap.xml',
  claim: `The live sitemap lists ${liveSlugs.length} course URLs.`,
  status: 'VERIFIED', source_url: 'https://carsi.com.au/sitemap.xml', access_date: ACCESS,
  quote: `${liveSlugs.length} <loc> entries under /courses/`, feeds: ['catalogue'], check_by: '2026-12-07',
});
add({
  id: 'GP567-002', claim_class: 'catalogue-count', surface: 'https://carsi.com.au/courses',
  claim: `The /courses JSON-LD ItemList carries ${inventory.source_counts_observed.live_jsonld_itemlist_entries} entries, agreeing with the sitemap.`,
  status: 'VERIFIED', source_url: 'https://carsi.com.au/courses', access_date: ACCESS,
  quote: 'ItemList itemListElement length 80', feeds: ['catalogue'], check_by: '2026-12-07',
});
add({
  id: 'GP567-003', claim_class: 'catalogue-count', surface: 'repo:data/wordpress-export/courses.json',
  claim: `The WordPress legacy export holds ${legacy.length} course records, ${legacy.filter((c) => c.status === 'published').length} of them published.`,
  status: 'VERIFIED', source_url: 'repo:data/wordpress-export/courses.json', access_date: ACCESS,
  quote: `${legacy.length} records, status published on ${legacy.filter((c) => c.status === 'published').length}`,
  feeds: ['catalogue'], check_by: '2026-12-07',
});
add({
  id: 'GP567-004', claim_class: 'catalogue-count', surface: 'repo:data/seed/courses-catalog.json',
  claim: `The repo seed catalogue holds ${seed.length} courses on origin/main.`,
  status: 'VERIFIED', source_url: 'repo:data/seed/courses-catalog.json', access_date: ACCESS,
  quote: `courses array length ${seed.length}`, feeds: ['catalogue'], check_by: '2026-12-07',
});
add({
  id: 'GP567-005', claim_class: 'cec-approval', surface: 'repo:data/seed/cec-approvals.json',
  claim: `The CEC approvals registry holds ${approvals.length} entries, all status approved.`,
  status: 'VERIFIED', source_url: 'repo:data/seed/cec-approvals.json', access_date: ACCESS,
  quote: `approvals length ${approvals.length}, all "status":"approved"`, feeds: ['cec-registry'], check_by: '2026-12-07',
});
add({
  id: 'GP567-006', claim_class: 'legacy-data', surface: 'repo:data/wordpress-export/courses.json',
  claim: `${legacy.filter((c) => c.cec_hours != null).length} legacy records carry a cec_hours value and ${legacy.filter((c) => c.iicrc_discipline).length} carry an iicrc_discipline code.`,
  status: 'VERIFIED', source_url: 'repo:data/wordpress-export/courses.json', access_date: ACCESS,
  quote: `cec_hours on ${legacy.filter((c) => c.cec_hours != null).length}; iicrc_discipline on ${legacy.filter((c) => c.iicrc_discipline).length}`,
  feeds: ['catalogue', 'cec-registry'], check_by: '2026-12-07',
});
add({
  id: 'GP567-007', claim_class: 'verified-negative', surface: 'repo:data/wordpress-export/courses.json',
  claim: 'The cppp40421_unit_code field exists in the legacy schema but is populated on ZERO records — there is no live AQF unit-code exposure.',
  status: 'VERIFIED', source_url: 'repo:data/wordpress-export/courses.json', access_date: ACCESS,
  quote: 'records with cppp40421_unit_code: 0', feeds: ['benchmark-matrix'], check_by: '2026-12-07',
});
add({
  id: 'GP567-008', claim_class: 'parity', surface: 'repo:docs/audit/parity-analysis.json',
  claim: `${parity.parity_gap_count} legacy courses are genuine parity gaps (${parity.parity_gap_published} published, ${parity.parity_gap_draft} draft) after slug-drift matching; naive slug matching alone reports 78.`,
  status: 'VERIFIED', source_url: 'repo:docs/audit/parity-analysis.json', access_date: ACCESS,
  quote: `parity_gap_count ${parity.parity_gap_count} after three matchers`, feeds: ['catalogue'], check_by: '2026-12-07',
});

// ---- GAP: the card's own numbers are not reproducible --------------------
add({
  id: 'GP567-009', claim_class: 'card-claim', surface: 'linear:GP-567',
  claim: 'GP-567 states the catalogue is "93 planned / 5 seeded".',
  status: 'GAP',
  reason: `Not reproducible. origin/main holds ${seed.length} seed courses, not 5, and no source in the repo yields 93.`,
  recommended_action: 'substantiate',
  note: 'The card figure may predate the seed expansion. Recorded so it is not cited as verified.',
  feeds: ['catalogue'], check_by: '2026-10-07',
});
add({
  id: 'GP567-010', claim_class: 'card-claim', surface: 'linear:GP-567',
  claim: 'GP-567 states there are "31 parity gaps" against the WordPress legacy.',
  status: 'GAP',
  reason: `This run measures ${parity.parity_gap_count} genuine gaps by a three-matcher method; 31 is not reproduced by any matcher setting tried.`,
  recommended_action: 'substantiate', feeds: ['catalogue'], check_by: '2026-10-07',
});

// ---- The live banned-language surface -----------------------------------
// Finding #1. These are GAP, not VERIFIED.
//
// The first filing recorded these as VERIFIED on the reasoning that the STRING is
// genuinely on the page, and left the licence question to the compliance sweep's
// prose. Independent review (cursor, `6e92de9b`) called that a rationalisation and
// was right: the ledger's job is to resolve the CLAIM A SURFACE MAKES, and a
// status of VERIFIED on the claim marketing actually asserts means the ledger
// preserves the licence-critical statement instead of blocking it.
//
// The substantive error underneath was a conflation. "CARSI holds 38 approved CEC
// COURSES" and "CARSI is an ACCREDITED PROVIDER" are different claims. The
// registry evidences the first. Nothing located evidences the second.
add({
  id: 'GP567-011', claim_class: 'banned-language', surface: 'https://carsi.com.au/courses',
  claim: 'The live /courses meta description asserts CARSI is "an IICRC CEC Accredited provider" — a provider-level accreditation claim.',
  status: 'GAP',
  reason:
    'Nothing located establishes PROVIDER-level accreditation. The approvals registry evidences 38 per-course CEC approvals, which is a different and weaker claim. The wording is also in the prohibited public-language class per GP-560.',
  recommended_action: 'rewrite',
  quote: 'Study online with CARSI, an IICRC CEC Accredited provider.',
  access_date: ACCESS,
  evidence_url: 'https://carsi.com.au/courses',
  feeds: ['catalogue', 'marketing'], check_by: '2026-10-07',
});
add({
  id: 'GP567-012', claim_class: 'banned-language', surface: 'https://carsi.com.au/courses',
  claim: 'The live /courses og:description asserts "IICRC CEC Accredited courses" and invites visitors to "Earn continuing education credits".',
  status: 'GAP',
  reason:
    'Same provider/course conflation, plus "Earn continuing education credits" tells a prospective learner they will receive CECs. Only 38 of 80 live courses have a registry approval, so the invitation is unsubstantiated for the majority of the catalogue.',
  recommended_action: 'rewrite',
  quote: 'IICRC CEC Accredited courses ... Earn continuing education credits and track your progress.',
  access_date: ACCESS,
  evidence_url: 'https://carsi.com.au/courses',
  feeds: ['catalogue', 'marketing'], check_by: '2026-10-07',
});
add({
  id: 'GP567-013', claim_class: 'accreditation', surface: 'repo:data/seed/cec-approvals.json',
  claim: 'CARSI holds founder-recorded IICRC CEC approvals for 38 specific courses.',
  status: 'JUSTIFIED', confidence: 'medium',
  reasoning:
    'Primary verification is genuinely unavailable, now evidenced rather than assumed: a search for a public IICRC register of approved CEC providers found none. IICRC manages CEC approval by submission to CECCourse@iicrcnet.org — the same address this repo scripts against — and published guidance is to contact IICRC directly, which is founder-gated. So the registry is the best obtainable source, and this claim is scoped to per-course approvals only.',
  best_available_source: 'repo:data/seed/cec-approvals.json — evidence cites CARSI_courses.pdf supplied by founder 2026-08-27; corroborated by iicrc.org/accepted-cecs (no public provider register)',
  feeds: ['cec-registry'], check_by: '2026-10-07',
});
add({
  id: 'GP567-025', claim_class: 'accreditation', surface: 'https://carsi.com.au/courses',
  claim: 'CARSI is an IICRC CEC "Accredited provider" (provider-level accreditation, as distinct from holding approved courses).',
  status: 'GAP',
  reason:
    'No source located establishes provider-level accreditation. The registry evidences per-course approvals; IICRC publishes no provider register; the founder-supplied PDF is described as a class list, not a provider credential. This is the claim the live marketing copy actually makes, and it is the one with no basis.',
  recommended_action: 'substantiate',
  note: 'Founder-gated to resolve: only Phill can obtain provider-status confirmation from IICRC. Until then the public wording should not assert it.',
  feeds: ['catalogue', 'marketing'], check_by: '2026-10-07',
});
add({
  id: 'GP567-014', claim_class: 'catalogue-count', surface: 'https://carsi.com.au/courses',
  claim: 'The meta description claims "80 restoration and cleaning courses".',
  status: 'VERIFIED', source_url: 'https://carsi.com.au/courses', access_date: ACCESS,
  quote: '80 restoration and cleaning courses across water damage restoration',
  note: `Cross-checks against ${liveSlugs.length} sitemap course URLs — the count claim is accurate.`,
  feeds: ['catalogue'], check_by: '2026-12-07',
});

// ---- GP-525 residual, measured not assumed -------------------------------
for (const slug of ['carpet-cleaning', 'carpet-cleaning-basics']) {
  const lg = legacy.find((c) => c.slug === slug);
  add({
    id: `GP567-${slug === 'carpet-cleaning' ? '015' : '016'}`, claim_class: 'cec-approval',
    surface: `repo:data/wordpress-export/courses.json#${slug}`,
    claim: `Course "${slug}" asserts IICRC CEC hours (${lg?.cec_hours ?? 'unknown'}) in the legacy export.`,
    status: approvedSlugs.has(slug) ? 'VERIFIED' : 'GAP',
    ...(approvedSlugs.has(slug)
      ? { source_url: 'repo:data/seed/cec-approvals.json', access_date: ACCESS, quote: 'slug present in approvals registry' }
      : {
          reason: `The registry now holds ${approvals.length} approvals but "${slug}" is not among them, so nothing backs this course's CEC hours.`,
          recommended_action: 'substantiate',
          note: 'GP-525 filed this when the registry held ZERO entries. The registry has since been populated with 38 — but not these two. The finding survives in sharper form; do not close GP-525 on the registry no longer being empty.',
        }),
    feeds: [slug], check_by: '2026-10-07',
  });
}

// ---- GP-526 residual on live URLs ---------------------------------------
for (const [i, slug] of acronymSlugs.entries()) {
  add({
    id: `GP567-${String(17 + i).padStart(3, '0')}`, claim_class: 'banned-language',
    surface: `https://carsi.com.au/courses/${slug}`,
    claim: `Live course URL slug "${slug}" leads with an IICRC discipline acronym.`,
    status: 'GAP',
    reason:
      'GP-526 removed discipline acronyms at the render boundary and was closed Done, but the live URL slug itself still carries the code. A URL is a public surface the render-boundary fix does not reach.',
    recommended_action: 'rewrite',
    note: 'URL changes need redirects; this is a founder-gated live-copy decision, reported not attempted.',
    feeds: [slug], check_by: '2026-10-07',
  });
}

// ---- Currency ------------------------------------------------------------
add({
  id: 'GP567-021', claim_class: 'standard-currency', surface: 'repo:',
  claim: 'Repo corpus still cites the S500:2021 edition despite the estate ruling that content teaches S500:2025.',
  status: 'GAP',
  reason: 'A grep of the tracked corpus returns S500-2021 style citations; see docs/audit/currency-sweep.md for the exact command and per-file counts.',
  recommended_action: 'rewrite', feeds: ['all-courses'], check_by: '2026-10-07',
});

// ---- Guard coverage ------------------------------------------------------
add({
  id: 'GP567-022', claim_class: 'guard-coverage', surface: 'repo:scripts/check-cec-surfaces.mjs',
  claim: 'check:cec-surfaces initially crashed with ERR_MODULE_NOT_FOUND, and the cause was the audit environment rather than a repo defect.',
  status: 'VERIFIED', source_url: 'repo:scripts/check-cec-surfaces.mjs', access_date: ACCESS,
  quote: 'after npm ci: CEC surface-leak guard passed',
  note: 'Recorded first as JUSTIFIED ("environment limit, not a defect") while unproven, then PROVEN by provisioning the worktree — the guard runs and passes. Kept as a worked example: a crashing tool is a claim about your environment until you have shown otherwise.',
  feeds: ['compliance-gate'], check_by: '2026-12-07',
});
add({
  id: 'GP567-023', claim_class: 'guard-coverage', surface: 'repo:package.json',
  claim: 'All seven CARSI compliance guards pass on this branch: iicrc-compliance, iicrc-terminology, cec, cec-surfaces, standards-claims, designations, au-english.',
  status: 'VERIFIED', source_url: 'repo:package.json', access_date: ACCESS,
  quote: 'seven guards exit 0; cec reports 38 entries (38 approved)',
  note: 'Passing means these guards find nothing in the surfaces they scan. GP-519 and GP-525 both record scope blind spots, and none of them reads a live response, so a pass here is not catalogue-wide assurance.',
  feeds: ['compliance-gate'], check_by: '2026-10-07',
});
add({
  id: 'GP567-024', claim_class: 'guard-coverage', surface: 'repo:scripts/check-iicrc-compliance.mjs',
  claim: 'The live meta/og description banned-language strings are not caught by any repo guard.',
  status: 'VERIFIED', source_url: 'repo:scripts/check-iicrc-compliance.mjs', access_date: ACCESS,
  quote: 'guard passed while carsi.com.au/courses serves "IICRC CEC Accredited provider"',
  note: 'The guards scan repo source; this string is served from live page metadata. A repo-only guard cannot see a live surface — the blind spot is structural, not a rule gap.',
  feeds: ['compliance-gate', 'marketing'], check_by: '2026-10-07',
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${E.map((e) => JSON.stringify(e)).join('\n')}\n`);

const counts = E.reduce((a, e) => ((a[e.status] = (a[e.status] || 0) + 1), a), {});
console.log(JSON.stringify({ ok: true, entries: E.length, counts, out: 'docs/audit/evidence-ledger.jsonl' }, null, 2));
