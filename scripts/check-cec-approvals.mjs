#!/usr/bin/env node
/**
 * CEC approvals registry validator (licence-critical) — `npm run check:cec`.
 *
 * Validates `data/seed/cec-approvals.json`, the single source of truth for IICRC CEC
 * hours. IICRC arithmetic (first-source, iicrc.org): 1 CEC = 1 educational/contact hour,
 * so approved hours must be whole numbers ≥ 1 and can never exceed the course's
 * educational hours. Fail-closed: a missing, unparseable or invalid registry fails the
 * build — an invalid registry could put an unapproved CEC claim on the public site.
 *
 *   node scripts/check-cec-approvals.mjs      # CI + manual
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = join(ROOT, 'data', 'seed', 'cec-approvals.json');
const CATALOG_PATH = join(ROOT, 'data', 'seed', 'courses-catalog.json');

const VALID_STATUSES = ['approved', 'submitted', 'not_submitted'];

const errors = [];

function fail(msg) {
  errors.push(msg);
}

let registry;
try {
  registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
} catch (err) {
  console.error(`✖ check:cec — cannot read/parse ${REGISTRY_PATH}: ${err.message}`);
  console.error('The CEC approvals registry is the SSOT for CEC hours; a broken registry is a release blocker.');
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
} catch (err) {
  console.error(`✖ check:cec — cannot read/parse ${CATALOG_PATH}: ${err.message}`);
  process.exit(1);
}

if (typeof registry !== 'object' || registry === null || !Array.isArray(registry.approvals)) {
  console.error('✖ check:cec — registry must be an object with an "approvals" array.');
  process.exit(1);
}

const catalogBySlug = new Map(
  (Array.isArray(catalog?.courses) ? catalog.courses : []).map((c) => [c.slug, c])
);
if (catalogBySlug.size === 0) {
  console.error('✖ check:cec — courses catalog has no courses; cannot validate registry slugs.');
  process.exit(1);
}

const seen = new Set();
registry.approvals.forEach((entry, i) => {
  const label = `approvals[${i}]${entry?.slug ? ` (${entry.slug})` : ''}`;

  if (typeof entry !== 'object' || entry === null) {
    fail(`${label}: entry must be an object.`);
    return;
  }
  if (typeof entry.slug !== 'string' || !entry.slug.trim()) {
    fail(`${label}: missing "slug".`);
    return;
  }
  const slug = entry.slug.trim();
  if (seen.has(slug.toLowerCase())) {
    fail(`${label}: duplicate entry for slug "${slug}".`);
  }
  seen.add(slug.toLowerCase());

  const course = catalogBySlug.get(slug);
  if (!course) {
    fail(`${label}: slug "${slug}" does not exist in data/seed/courses-catalog.json.`);
  }

  if (!VALID_STATUSES.includes(entry.status)) {
    fail(`${label}: status "${entry.status}" invalid — must be one of ${VALID_STATUSES.join(' | ')}.`);
    return;
  }

  if (entry.status === 'approved') {
    const hours = entry.approvedHours;
    if (typeof hours !== 'number' || !Number.isFinite(hours)) {
      fail(`${label}: approved entry must record numeric "approvedHours".`);
    } else {
      if (!Number.isInteger(hours)) {
        fail(`${label}: approvedHours ${hours} is fractional — 1 CEC = 1 whole educational hour (iicrc.org).`);
      }
      if (hours < 1) {
        fail(`${label}: approvedHours ${hours} must be ≥ 1 for an approved course.`);
      }
      const eduHours = course?.durationHours;
      if (typeof eduHours === 'number' && Number.isFinite(eduHours) && hours > eduHours) {
        fail(
          `${label}: approvedHours ${hours} exceeds the course's educational hours (${eduHours}) — 1 CEC = 1 contact hour, so CECs can never exceed course hours.`
        );
      }
    }
    if (typeof entry.approvedAt !== 'string' || Number.isNaN(Date.parse(entry.approvedAt))) {
      fail(`${label}: approved entry must record "approvedAt" as a parseable date.`);
    }
    if (typeof entry.iicrcReference !== 'string' || !entry.iicrcReference.trim()) {
      fail(`${label}: approved entry must record "iicrcReference" (the IICRC approval reference).`);
    }
    if (typeof entry.evidence !== 'string' || !entry.evidence.trim()) {
      fail(`${label}: approved entry must record "evidence" (where the approval proof lives).`);
    }
  } else if (
    entry.approvedHours != null &&
    !(typeof entry.approvedHours === 'number' && entry.approvedHours === 0)
  ) {
    fail(
      `${label}: status "${entry.status}" must not carry approvedHours (${entry.approvedHours}) — hours are recorded only on approval.`
    );
  }
});

if (errors.length > 0) {
  console.error(`\n✖ CEC approvals registry check failed — ${errors.length} issue(s)\n`);
  console.error(errors.map((e) => `  ${e}`).join('\n'));
  console.error(
    '\nThe registry (data/seed/cec-approvals.json) is the SSOT for IICRC CEC hours. Only the founder' +
      '\nadds approvals, after per-course IICRC confirmation (see scripts/generate-cec-submission.ts).\n'
  );
  process.exit(1);
}

const approved = registry.approvals.filter((e) => e.status === 'approved').length;
console.log(
  `✓ CEC approvals registry valid — ${registry.approvals.length} entr${registry.approvals.length === 1 ? 'y' : 'ies'} (${approved} approved).`
);
process.exit(0);
