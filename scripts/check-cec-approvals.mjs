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
 * It ALSO enforces catalogue ↔ registry consistency: `resolveCatalogCecHours` treats an
 * explicit positive `cecHours` in courses-catalog.json as founder approval when the registry
 * has no entry, so the catalogue must never hold a positive (or coercible-to-positive) value
 * the registry has not approved. That keeps the registry the effective SSOT without changing
 * the resolver. The pure `validateCecApprovals` is unit-tested by check-cec-approvals.test.mjs.
 *
 *   node scripts/check-cec-approvals.mjs      # CI + manual
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const VALID_STATUSES = ['approved', 'submitted', 'not_submitted'];

/**
 * Validate a parsed registry against a parsed catalogue. Pure (no I/O, no process.exit) so it
 * is unit-testable. Returns every problem found; the caller decides how to fail.
 */
export function validateCecApprovals(registry, catalog) {
  const errors = [];
  const fail = (msg) => errors.push(msg);

  if (typeof registry !== 'object' || registry === null || !Array.isArray(registry.approvals)) {
    fail('registry must be an object with an "approvals" array.');
    return { errors, approvedCount: 0 };
  }

  const courses = Array.isArray(catalog?.courses) ? catalog.courses : [];
  const catalogBySlug = new Map(courses.map((c) => [c.slug, c]));
  if (catalogBySlug.size === 0) {
    fail('courses catalog has no courses; cannot validate registry slugs.');
    return { errors, approvedCount: 0 };
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

  // Catalogue ↔ registry consistency (licence-critical, GP-498). FAIL-CLOSED on the catalogue
  // `cecHours` field: it must be a number (0 = not approved). A coercible string such as "5"
  // would be parsed to a positive by resolveCatalogCecHours (parseFloat), so a non-number is a
  // hazard and is rejected. Every finite positive value MUST have an `approved` registry entry,
  // so an unapproved positive can never exist in the catalogue for the resolver to surface.
  const approvedSlugs = new Set(
    registry.approvals
      .filter((e) => e && e.status === 'approved' && typeof e.slug === 'string')
      .map((e) => e.slug.trim().toLowerCase())
  );
  for (const course of courses) {
    const hours = course?.cecHours;
    if (hours == null) continue; // no CEC advertised — fine
    const slug = typeof course?.slug === 'string' ? course.slug.trim() : '';
    if (typeof hours !== 'number' || !Number.isFinite(hours)) {
      fail(
        `courses-catalog.json course "${slug || '(no slug)'}" has non-numeric cecHours ` +
          `${JSON.stringify(hours)} — cecHours must be a number (0 = not CEC-approved). Coercible ` +
          `values are a licence hazard (resolveCatalogCecHours would parseFloat them).`
      );
      continue;
    }
    if (hours > 0 && (!slug || !approvedSlugs.has(slug.toLowerCase()))) {
      fail(
        `courses-catalog.json course "${slug || '(no slug)'}" advertises cecHours ${hours} but has no ` +
          `approved registry entry — CEC hours require a founder-confirmed IICRC approval in ` +
          `cec-approvals.json. Set cecHours: 0 or add the registry approval.`
      );
    }
  }

  const approvedCount = registry.approvals.filter((e) => e && e.status === 'approved').length;
  return { errors, approvedCount };
}

// Run the validator only when invoked directly (not when imported by the self-test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
  const REGISTRY_PATH = join(ROOT, 'data', 'seed', 'cec-approvals.json');
  const CATALOG_PATH = join(ROOT, 'data', 'seed', 'courses-catalog.json');

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

  const { errors, approvedCount } = validateCecApprovals(registry, catalog);

  if (errors.length > 0) {
    console.error(`\n✖ CEC approvals registry check failed — ${errors.length} issue(s)\n`);
    console.error(errors.map((e) => `  ${e}`).join('\n'));
    console.error(
      '\nThe registry (data/seed/cec-approvals.json) is the SSOT for IICRC CEC hours. Only the founder' +
        '\nadds approvals, after per-course IICRC confirmation (see scripts/generate-cec-submission.ts).\n'
    );
    process.exit(1);
  }

  const total = registry.approvals.length;
  console.log(
    `✓ CEC approvals registry valid — ${total} entr${total === 1 ? 'y' : 'ies'} (${approvedCount} approved).`
  );
  process.exit(0);
}
