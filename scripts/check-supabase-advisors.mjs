#!/usr/bin/env node
/**
 * Supabase security-advisor drift guard (CARSI issue #121).
 *
 * Why: CARSI's Supabase project is hosted Postgres behind Prisma (role
 * `postgres`, which owns the tables and bypasses RLS). PostgREST + the public
 * anon key are on, so any NEW `public` table created without RLS is silently
 * exposed to the internet (this is exactly how lms_google_oauth_tokens leaked).
 * The #121 migration locks the current surface; this guard stops it reopening.
 *
 * How: pulls live SECURITY advisors from the Supabase Management API and diffs
 * them against a committed baseline (docs/security/advisor-baseline.json). It
 * FAILS only on advisors that are NOT in the baseline — i.e. genuinely new
 * regressions — so it never false-alarms on the known #121 backlog or the
 * deliberately-deferred items (extension_in_public, etc.).
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/check-supabase-advisors.mjs
 *       -> CI guard. Exit 1 if any NEW security advisor appeared.
 *   ... node scripts/check-supabase-advisors.mjs --report
 *       -> print full summary, never fail (exit 0).
 *   ... node scripts/check-supabase-advisors.mjs --update-baseline
 *       -> rewrite the baseline to the current live state (run after the #121
 *          migration applies, so the baseline shrinks to ~0).
 *
 * Env:
 *   SUPABASE_ACCESS_TOKEN  (required) — 1Password: Unite-Group-Infrastructure
 *   SUPABASE_PROJECT_REF   (optional) — defaults to the CARSI project ref
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'ofzafxvxobjggjisrbsa';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'docs/security/advisor-baseline.json');

const argv = new Set(process.argv.slice(2));
const MODE = argv.has('--update-baseline')
  ? 'update'
  : argv.has('--report')
    ? 'report'
    : 'guard';

// Severity that should hard-fail when newly introduced. WARN-level drift is
// reported but does not fail the build by default (tune via FAIL_ON_WARN=1).
const FAIL_ON_WARN = process.env.FAIL_ON_WARN === '1';

function die(msg, code = 2) {
  console.error(`✖ ${msg}`);
  process.exit(code);
}

function fingerprint(lint) {
  const m = lint.metadata || {};
  const entity =
    m.entity ||
    (m.name ? `${m.schema ?? ''}.${m.name}` : null) ||
    lint.cache_key ||
    lint.title;
  return { name: lint.name, level: lint.level, entity };
}
const key = (f) => `${f.name}::${f.entity}`;

async function fetchAdvisors() {
  if (!TOKEN) die('SUPABASE_ACCESS_TOKEN is not set (1Password → Unite-Group-Infrastructure).');
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/advisors/security`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) die(`Management API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const lints = Array.isArray(data?.lints) ? data.lints : [];
  return lints.map(fingerprint).sort((a, b) => key(a).localeCompare(key(b)));
}

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).fingerprints ?? [];
  } catch {
    die(`Cannot read baseline at ${BASELINE_PATH}. Run --update-baseline first.`);
  }
}

const live = await fetchAdvisors();

if (MODE === 'update') {
  const out = {
    _comment:
      'Baseline snapshot of CARSI Supabase SECURITY advisors. The recurring check fails only on advisors NOT in this list, so new RLS-disabled tables are caught. Regenerate after intentional schema/security changes.',
    project_ref: PROJECT_REF,
    generated_at: new Date().toISOString().slice(0, 10),
    advisor_type: 'security',
    count: live.length,
    fingerprints: live,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ Baseline updated: ${live.length} security advisors recorded.`);
  process.exit(0);
}

const baseline = loadBaseline();
const baseKeys = new Set(baseline.map(key));
const liveKeys = new Set(live.map(key));

const added = live.filter((f) => !baseKeys.has(key(f)));
const resolved = baseline.filter((f) => !liveKeys.has(key(f)));

const counts = (arr) =>
  arr.reduce((m, f) => ((m[f.level] = (m[f.level] || 0) + 1), m), {});

console.log(`Supabase security advisors for ${PROJECT_REF}`);
console.log(`  live: ${live.length} | baseline: ${baseline.length}`);
console.log(`  NEW (not in baseline): ${added.length} ${JSON.stringify(counts(added))}`);
console.log(`  resolved since baseline: ${resolved.length}`);

if (added.length) {
  console.log('\nNew advisors:');
  for (const f of added) console.log(`  + [${f.level}] ${f.name} — ${f.entity}`);
}
if (resolved.length && MODE === 'report') {
  console.log('\nResolved (baseline can be shrunk via --update-baseline):');
  for (const f of resolved) console.log(`  - [${f.level}] ${f.name} — ${f.entity}`);
}

if (MODE === 'report') process.exit(0);

const failing = added.filter((f) => f.level === 'ERROR' || (FAIL_ON_WARN && f.level === 'WARN'));
if (failing.length) {
  console.error(
    `\n✖ ${failing.length} new ${FAIL_ON_WARN ? '' : 'ERROR-level '}security advisor(s) introduced. ` +
      `If a new public table is intentional, add RLS (see docs/security/) then re-baseline ` +
      `with: node scripts/check-supabase-advisors.mjs --update-baseline`,
  );
  process.exit(1);
}
console.log('\n✓ No new blocking security advisors.');
process.exit(0);
