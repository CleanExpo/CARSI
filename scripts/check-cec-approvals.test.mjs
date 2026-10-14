#!/usr/bin/env node
/**
 * Non-vacuity proof for the CEC approvals registry validator (GP-498), focused on the
 * catalogue ↔ registry consistency that closes the resolveCatalogCecHours concern: a positive
 * (or coercible-to-positive) catalogue cecHours without an approved registry entry MUST fail.
 */
import {
  findExpiringCecApprovals,
  formatExpiryWarning,
  validateCecApprovals,
} from './check-cec-approvals.mjs';

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

// Expiry warning (non-blocking): an approval inside the 90-day window MUST be reported, one
// outside it must not, and neither may turn the validator red.
const NOW = new Date('2026-11-01T00:00:00Z');
const expiryRegistry = {
  version: 1,
  approvals: [
    { ...approvedRegistry.approvals[0], expiresAt: '2027-01-18' },
    { ...approvedRegistry.approvals[0], slug: 'far-off', expiresAt: '2028-05-15' },
    { ...approvedRegistry.approvals[0], slug: 'lapsed', expiresAt: '2026-10-01' },
    { slug: 'pending', status: 'submitted', expiresAt: '2026-11-01' },
  ],
};
const expiring = findExpiringCecApprovals(expiryRegistry, NOW, 90);
const expect = (name, ok, detail) => {
  if (!ok) {
    console.error(`✖ ${name}${detail ? `: ${detail}` : ''}`);
    failed++;
  }
};
expect(
  'expiring + lapsed approvals are reported, soonest first; far-off and non-approved are not',
  JSON.stringify(expiring.map((e) => e.slug)) === JSON.stringify(['lapsed', 'water-damage-restoration']),
  JSON.stringify(expiring)
);
expect('days left is counted (2026-11-01 → 2027-01-18 = 78)', expiring[1]?.daysLeft === 78, JSON.stringify(expiring[1]));
expect(
  'warning is a GitHub annotation naming the slug',
  formatExpiryWarning(expiring[1]).startsWith('::warning') &&
    formatExpiryWarning(expiring[1]).includes('water-damage-restoration'),
);
expect(
  '96 days out is outside the 90-day window',
  findExpiringCecApprovals(expiryRegistry, new Date('2026-10-14T00:00:00Z'), 90).every(
    (e) => e.slug !== 'water-damage-restoration'
  )
);
expect('a lapsed approval says EXPIRED', formatExpiryWarning(expiring[0]).includes('EXPIRED'));
expect(
  'an expiring approval does not fail validation',
  validateCecApprovals({ version: 1, approvals: [expiryRegistry.approvals[0]] }, courses(2)).errors
    .length === 0
);

if (failed > 0) {
  console.error(`\n✖ CEC approvals validator self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(`✓ CEC approvals validator self-test passed (${cases.length} cases).`);
process.exit(0);
