#!/usr/bin/env node
/**
 * Non-vacuity proof for the CEC approvals registry validator (GP-498), focused on the
 * catalogue ↔ registry consistency that closes the resolveCatalogCecHours concern: a positive
 * (or coercible-to-positive) catalogue cecHours without an approved registry entry MUST fail.
 */
import { validateCecApprovals } from './check-cec-approvals.mjs';

const approvedRegistry = {
  version: 1,
  approvals: [
    {
      slug: 'water-damage-restoration',
      status: 'approved',
      approvedHours: 2,
      approvedAt: '2026-01-01',
      iicrcReference: 'REF-1',
      evidence: 'email',
    },
  ],
};
const emptyRegistry = { version: 1, approvals: [] };

function courses(cecHours) {
  return { courses: [{ slug: 'water-damage-restoration', title: 'X', durationHours: 4, cecHours }] };
}

const cases = [
  // [name, registry, catalog, shouldFail]
  ['numeric positive WITHOUT approval fails', emptyRegistry, courses(5), true],
  ['coercible string "5" WITHOUT approval fails (the P1 gap)', emptyRegistry, courses('5'), true],
  ['string "0" is still non-numeric → fails closed', emptyRegistry, courses('0'), true],
  ['boolean cecHours fails closed', emptyRegistry, courses(true), true],
  ['numeric positive WITH approval passes', approvedRegistry, courses(2), false],
  ['zero cecHours passes (explicit not-approved)', emptyRegistry, courses(0), false],
  ['null cecHours passes', emptyRegistry, courses(null), false],
];

let failed = 0;
for (const [name, registry, catalog, shouldFail] of cases) {
  const { errors } = validateCecApprovals(registry, catalog);
  const didFail = errors.length > 0;
  if (didFail !== shouldFail) {
    console.error(
      `✖ ${name}: expected ${shouldFail ? 'FAIL' : 'PASS'}, got ${didFail ? 'FAIL' : 'PASS'}` +
        (errors.length ? `\n    ${errors.join('\n    ')}` : '')
    );
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n✖ CEC approvals validator self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(`✓ CEC approvals validator self-test passed (${cases.length} cases).`);
process.exit(0);
