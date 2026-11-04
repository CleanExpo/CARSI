#!/usr/bin/env node
/**
 * Non-vacuity proof for the live /courses money-path check (GP-676): each rule must FIRE on the
 * fault it exists for and STAY SILENT on what live showed on 4 Nov 2026 (first screen carries the
 * "IICRC CEC Accredited courses (27)" link but no priced card; the CEC tab lists 27 approved
 * classes).
 */
import assert from 'node:assert/strict';

import {
  CEC_PATH,
  currentCecSlugs,
  isCecLink,
  judgeCecList,
  judgeFirstScreen,
  pricedAud,
  summarise,
} from './check-live-courses-money-path.mjs';

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  ✗ ${name}\n    ${e.message}`);
  }
}

const SITE = 'https://carsi.com.au';
const NOW = new Date('2026-11-04T04:00:00Z');
const REGISTRY = {
  approvals: [
    { slug: 'approved-a', status: 'approved', approvedHours: 1, expiresAt: '2027-01-18' },
    { slug: 'approved-b', status: 'approved', approvedHours: 2, expiresAt: '2028-05-15' },
    { slug: 'lapsed', status: 'approved', approvedHours: 1, expiresAt: '2026-11-04' },
    { slug: 'no-expiry', status: 'approved', approvedHours: 1 },
    { slug: 'zero-hours', status: 'approved', approvedHours: 0, expiresAt: '2028-01-01' },
    { slug: 'submitted', status: 'submitted', expiresAt: '2028-01-01' },
  ],
};

check('the CEC link the ticket names is the path the check opens', () => {
  assert.equal(CEC_PATH, '/courses?discipline=iicrc-cec#catalogue');
});

check('reads a price only when it is above zero', () => {
  assert.equal(pricedAud('$29CARSI Specialty Courses Collection1 CEC'), 29);
  assert.equal(pricedAud('View · $1,250'), 1250);
  assert.equal(pricedAud('A$ 49.50'), 49.5);
  assert.equal(pricedAud('Free'), null);
  assert.equal(pricedAud('$0'), null);
  assert.equal(pricedAud('1 CEC  10 mods'), null);
});

check('a CEC link is the catalogue with discipline=iicrc-cec on the audited site only', () => {
  assert.equal(isCecLink('/courses?discipline=iicrc-cec#catalogue', SITE), true);
  assert.equal(isCecLink('https://carsi.com.au/courses?discipline=iicrc-cec', SITE), true);
  assert.equal(isCecLink('/courses?discipline=IICRC-CEC', SITE), true);
  assert.equal(isCecLink('/courses', SITE), false);
  assert.equal(isCecLink('/courses?discipline=free#catalogue', SITE), false);
  assert.equal(isCecLink('/pricing?discipline=iicrc-cec', SITE), false);
  assert.equal(isCecLink('https://evil.example/courses?discipline=iicrc-cec', SITE), false);
  assert.equal(isCecLink('#catalogue', SITE), false);
});

check('first screen with no priced class and no CEC link is a fault (GP-676 rule 1)', () => {
  const r = judgeFirstScreen({
    site: SITE,
    label: 'desktop',
    courseLinks: [
      { href: '/courses/free-a', text: 'Free Intro to drying' },
      { href: '/courses/free-b', text: 'Free' },
    ],
    links: ['/', '/courses', '#catalogue', '/pricing'],
  });
  assert.match(r.fault, /NO PRICED CLASS AND NO CEC LINK/);
});

check('first screen passes on the CEC link alone (what live showed on 4 Nov)', () => {
  const r = judgeFirstScreen({
    site: SITE,
    label: 'desktop',
    courseLinks: [],
    links: ['/', '#catalogue', '/courses?discipline=iicrc-cec#catalogue', '/pricing'],
  });
  assert.equal(r.fault, null);
  assert.equal(r.cecLinks, 1);
});

check('first screen passes on a priced class alone', () => {
  const r = judgeFirstScreen({
    site: SITE,
    label: 'mobile',
    courseLinks: [{ href: '/courses/approved-a', text: '$29 1 CEC Approved A' }],
    links: ['/'],
  });
  assert.equal(r.fault, null);
  assert.equal(r.pricedClasses, 1);
});

check('the catalogue itself (/courses) is not counted as a priced class', () => {
  const r = judgeFirstScreen({
    site: SITE,
    label: 'desktop',
    courseLinks: [{ href: '/courses', text: 'Courses from $29' }],
    links: ['/courses'],
  });
  assert.match(r.fault, /NO PRICED CLASS AND NO CEC LINK/);
});

check('only current approvals count as CEC-approved (same rule as isCecApprovalCurrent)', () => {
  const s = currentCecSlugs(REGISTRY, NOW);
  assert.deepEqual([...s].sort(), ['approved-a', 'approved-b']);
});

check('a CEC tab listing a class that is not CEC-approved is a fault (GP-676 rule 2)', () => {
  const approved = currentCecSlugs(REGISTRY, NOW);
  const r = judgeCecList({
    slugs: ['approved-a', 'water-damage-essentials', 'lapsed'],
    counter: 3,
    activeTab: 'IICRC CEC',
    approved,
  });
  assert.equal(r.error, null);
  assert.equal(r.faults.length, 2);
  assert.match(r.faults[0], /NOT CEC-APPROVED .*water-damage-essentials/);
  assert.match(r.faults[1], /NOT CEC-APPROVED .*lapsed/);
});

check('a clean CEC list has no faults', () => {
  const r = judgeCecList({
    slugs: ['approved-a', 'approved-b'],
    counter: 2,
    activeTab: 'IICRC CEC',
    approved: currentCecSlugs(REGISTRY, NOW),
  });
  assert.deepEqual(r, { faults: [], error: null });
});

check('the CEC link opening another tab is a fault, not a pass', () => {
  const r = judgeCecList({
    slugs: ['approved-a'],
    counter: 1,
    activeTab: 'All',
    approved: currentCecSlugs(REGISTRY, NOW),
  });
  assert.match(r.faults[0], /opened the "All" tab/);
});

check('an empty or partly read CEC list could not be judged (exit 2, never green)', () => {
  const approved = currentCecSlugs(REGISTRY, NOW);
  assert.match(
    judgeCecList({ slugs: [], counter: 0, activeTab: 'IICRC CEC', approved }).error,
    /empty/
  );
  assert.match(
    judgeCecList({ slugs: ['approved-a'], counter: 27, activeTab: 'IICRC CEC', approved }).error,
    /read 1 of 27/
  );
  assert.match(
    judgeCecList({ slugs: ['approved-a'], counter: null, activeTab: 'IICRC CEC', approved }).error,
    /counter/
  );
});

check('exit codes: fault is 1, could-not-judge or vacuous is 2, clean and non-vacuous is 0', () => {
  const base = { faults: [], errors: [], screensRead: 2, cecRead: 27 };
  assert.equal(summarise(base).code, 0);
  assert.equal(summarise({ ...base, faults: ['x'] }).code, 1);
  assert.equal(summarise({ ...base, errors: ['y'] }).code, 2);
  assert.equal(summarise({ ...base, screensRead: 0 }).code, 2);
  assert.equal(summarise({ ...base, screensRead: 1 }).code, 2);
  assert.equal(summarise({ ...base, cecRead: 0 }).code, 2);
  // A real fault outranks a read error: red, not "could not look".
  assert.equal(summarise({ ...base, faults: ['x'], errors: ['y'], cecRead: 0 }).code, 1);
});

if (failures) {
  console.error(`✗ ${failures} courses money-path test(s) failed`);
  process.exit(1);
}
console.log('✓ courses money-path tests passed');
