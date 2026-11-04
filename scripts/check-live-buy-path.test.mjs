#!/usr/bin/env node
/**
 * Non-vacuity proof for the live buy-path guard (GP-638): each rule must FIRE on the fault
 * measured 8 Oct 2026 and STAY SILENT on the clean colours measured 12 Oct 2026.
 */
import assert from 'node:assert/strict';

import {
  contrastRatio,
  findLocalOrigins,
  isUnreadable,
  judgeContrast,
  summarise,
} from './check-live-buy-path.mjs';

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

check('fires on the 8 Oct sign-out redirect', () => {
  assert.deepEqual(findLocalOrigins('http://localhost:8080/login'), ['http://localhost:8080']);
});
check('fires on local origins inside HTML', () => {
  const html =
    '<a href="https://localhost:8080/learn/x">Start</a><img src="//127.0.0.1:3000/a.png"><a href="http://preview.localhost/">p</a><a href="http://[::1]:8080/">v6</a>';
  assert.equal(findLocalOrigins(html).length, 4);
});
check('fires on entity-ended, css, srcset and escaped-JSON forms', () => {
  assert.deepEqual(findLocalOrigins('href="http://localhost:8080&quot;'), [
    'http://localhost:8080',
  ]);
  assert.deepEqual(findLocalOrigins('background:url(//localhost)'), ['//localhost']);
  assert.deepEqual(findLocalOrigins('srcset="http://localhost:3000/a.png 1x, x.png 2x"'), [
    'http://localhost:3000',
  ]);
  assert.deepEqual(findLocalOrigins('{"u":"http:\\/\\/localhost:8080\\/learn"}'), [
    'http://localhost:8080',
  ]);
  assert.deepEqual(findLocalOrigins('a=http://localhost:8080,b'), ['http://localhost:8080']);
});
check('stays silent on the production site and on prose', () => {
  assert.deepEqual(
    findLocalOrigins(
      '<a href="https://carsi.com.au/login">Sign in</a> localhost is not a link here; localhosted.com.au'
    ),
    []
  );
  assert.deepEqual(findLocalOrigins('https://localhosting.example.com/'), []);
});
check('fires on white text on a white field (GP-624)', () => {
  assert.equal(
    isUnreadable({ color: 'rgb(255, 255, 255)', background: 'rgb(255, 255, 255)' }),
    true
  );
  assert.equal(
    isUnreadable({ color: 'rgb(250, 250, 250)', background: 'rgb(255, 255, 255)' }),
    true
  );
});
check('stays silent on the colours measured live on 12 Oct', () => {
  assert.equal(isUnreadable({ color: 'rgb(55, 65, 81)', background: 'rgb(255, 255, 255)' }), false);
  assert.equal(isUnreadable({ color: 'rgb(31, 41, 55)', background: 'rgb(255, 255, 255)' }), false);
});
check('contrast is symmetric and 21 for black on white', () => {
  assert.equal(Math.round(contrastRatio('rgb(0,0,0)', 'rgb(255,255,255)')), 21);
  assert.equal(
    contrastRatio('rgb(0,0,0)', 'rgb(255,255,255)'),
    contrastRatio('rgb(255,255,255)', 'rgb(0,0,0)')
  );
});
check('a colour the guard cannot read is "unknown", never "readable"', () => {
  // Tailwind v4 computes colours as oklch(). An earlier draft returned "readable" for anything it
  // could not parse, so a white-on-white oklch field would have passed. Unknown fails the audit.
  assert.equal(judgeContrast({ color: 'oklch(1 0 0)', background: 'rgb(255,255,255)' }), 'unknown');
  assert.equal(judgeContrast({ color: 'transparent', background: 'rgb(255,255,255)' }), 'unknown');
  assert.equal(judgeContrast({ color: 'rgb(0,0,0)', background: '' }), 'unknown');
});
check('judgeContrast agrees with the measured fault and the measured clean colours', () => {
  assert.equal(
    judgeContrast({ color: 'rgb(255, 255, 255)', background: 'rgb(255, 255, 255)' }),
    'unreadable'
  );
  assert.equal(
    judgeContrast({ color: 'rgba(55, 65, 81, 1)', background: 'rgb(255, 255, 255)' }),
    'readable'
  );
});
check('a semi-transparent text colour is judged as it lands on its background', () => {
  // Dark text at 5% opacity on white is effectively white; reading it at full opacity misses it.
  assert.equal(
    judgeContrast({ color: 'rgba(0, 0, 0, 0.05)', background: 'rgb(255, 255, 255)' }),
    'unreadable'
  );
});
check('exit codes: fault is 1, unjudged or vacuous is 2, clean and non-vacuous is 0', () => {
  const base = { faults: [], unjudged: [], pagesRead: 9, fieldsRead: 12, redirectsRead: 2 };
  assert.equal(summarise(base).code, 0);
  assert.equal(summarise({ ...base, faults: ['x'] }).code, 1);
  assert.equal(summarise({ ...base, unjudged: ['y'] }).code, 2);
  assert.equal(summarise({ ...base, fieldsRead: 0 }).code, 2);
  assert.equal(summarise({ ...base, pagesRead: 0 }).code, 2);
  assert.equal(summarise({ ...base, redirectsRead: 1 }).code, 2);
  // A real fault outranks an unjudged field: red, not "could not look".
  assert.equal(summarise({ ...base, faults: ['x'], unjudged: ['y'] }).code, 1);
});

if (failures) {
  console.error(`✗ ${failures} buy-path guard test(s) failed`);
  process.exit(1);
}
console.log('✓ buy-path guard tests passed');
