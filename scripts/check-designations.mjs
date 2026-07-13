#!/usr/bin/env node
/**
 * CARSI designation registry guard.
 *
 * Validates data/seed/designations.json against the course catalogue so a
 * designation can never reference a missing/renamed course, and so the
 * pathway model stays well-formed. Fail-closed: any breakage is a release
 * blocker. Run: node scripts/check-designations.mjs
 */
import { readFileSync } from 'node:fs';

const CATALOG = 'data/seed/courses-catalog.json';
const REGISTRY = 'data/seed/designations.json';
const PROGRAM = 'CARSI Southern Hemisphere Restoration Designations';

const errors = [];
const err = (m) => errors.push(m);

let cat, reg;
try { cat = JSON.parse(readFileSync(CATALOG, 'utf8')); } catch (e) { err(`cannot read ${CATALOG}: ${e.message}`); }
try { reg = JSON.parse(readFileSync(REGISTRY, 'utf8')); } catch (e) { err(`cannot read ${REGISTRY}: ${e.message}`); }

if (cat && reg) {
  const courseBySlug = new Map(cat.courses.map((c) => [c.slug, c]));

  if (reg.program !== PROGRAM) err(`registry.program must be "${PROGRAM}" (got "${reg.program}")`);
  if (!Array.isArray(reg.designations) || reg.designations.length === 0) err('registry.designations must be a non-empty array');

  const seenSlug = new Set();
  for (const d of reg.designations || []) {
    const id = d.slug || '(no slug)';
    if (!d.slug || !/^carsi-[a-z0-9-]+$/.test(d.slug)) err(`${id}: slug must be kebab-case starting "carsi-"`);
    if (seenSlug.has(d.slug)) err(`${id}: duplicate designation slug`);
    seenSlug.add(d.slug);
    if (!d.name || !d.name.startsWith('CARSI ')) err(`${id}: name must start with "CARSI "`);
    // Practitioner-only convention: CARSI designations must NOT reuse IICRC's
    // credential nouns (Technician/Specialist/Master), so no CARSI designation is
    // identical to an IICRC one (founder directive 2026-07-10).
    if (d.name && !/\bPractitioner$/.test(d.name)) {
      err(`${id}: name must end with "Practitioner" (CARSI designations must not reuse IICRC nouns like Technician/Specialist)`);
    }
    if (d.name && /\b(Technician|Specialist|Master)\b/.test(d.name)) {
      err(`${id}: name reuses an IICRC credential noun (Technician/Specialist/Master) — use "Practitioner"`);
    }
    if (!d.summary || d.summary.length < 20) err(`${id}: summary missing/too short`);
    if (d.alsoEarnsCec !== true && d.alsoEarnsCec !== false) err(`${id}: alsoEarnsCec must be boolean`);
    if (d.completionRule !== 'all-required') err(`${id}: completionRule must be "all-required"`);

    // No IICRC discipline acronym may appear in a designation name/summary.
    const acr = /\b(WRT|ASD|AMRT|FSRT|CCT|TCST)\b|\[?discipline]?-aligned/;
    if (acr.test(`${d.name} ${d.summary}`)) err(`${id}: contains an IICRC discipline acronym / "-aligned" framing (banned)`);

    const steps = d.pathwaySteps || [];
    if (steps.length === 0) err(`${id}: pathwaySteps empty`);
    const orders = new Set();
    let requiredCredential = 0;
    for (const s of steps) {
      if (!courseBySlug.has(s.courseSlug)) err(`${id}: pathway step references unknown course "${s.courseSlug}"`);
      if (typeof s.order !== 'number') err(`${id}: step "${s.courseSlug}" missing numeric order`);
      if (orders.has(s.order)) err(`${id}: duplicate step order ${s.order}`);
      orders.add(s.order);
      if (typeof s.required !== 'boolean') err(`${id}: step "${s.courseSlug}" required must be boolean`);
      if (s.required && s.role === 'credential') requiredCredential++;
      // A credential course must itself carry the matching CARSI designation.
      const course = courseBySlug.get(s.courseSlug);
      if (s.role === 'credential' && course && course.meta && course.meta.designation && course.meta.designation !== d.name) {
        err(`${id}: credential course "${s.courseSlug}" has designation "${course.meta.designation}", expected "${d.name}"`);
      }
    }
    if (requiredCredential < 1) err(`${id}: must have at least one required step with role "credential"`);
  }
}

if (errors.length) {
  console.error('\n✖ CARSI designation registry guard failed\n');
  errors.forEach((e) => console.error('  - ' + e));
  console.error('\nFix data/seed/designations.json (see docs/specs/2026-07-10-carsi-southern-hemisphere-designation-pathway.md).\n');
  process.exit(1);
}
console.log(`✓ CARSI designation registry valid — ${reg.designations.length} designations.`);
process.exit(0);
