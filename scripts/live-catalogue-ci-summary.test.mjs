#!/usr/bin/env node
/**
 * The summary is what a human reads when the scheduled guard goes red. If it renders nothing,
 * or renders "clean" over a failure, the guard has caught a live licence breach and told
 * nobody — which is the same outcome as not running at all.
 *
 * So every branch is exercised, including the ones that exist because the guard itself broke.
 */
import assert from 'node:assert/strict';

import { KNOWN_IN_BREACH, renderSummary } from './live-catalogue-ci-summary.mjs';

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
}

const violation = (slug, title) => ({
  slug,
  title,
  url: `https://www.carsi.com.au/courses/${slug}`,
  hits: [{ rule: 'title-acronym', detail: 'WRT' }],
});

console.log('live-catalogue CI summary — a clean run says so, with a count');

check('renders the checked count on a clean audit', () => {
  const out = renderSummary(JSON.stringify({ site: 'https://x', checked: 80, violations: [], notes: [] }), '0');
  assert.match(out, /80 live courses checked, all clean/);
});

check('a clean summary is never empty — "clean" without a number is indistinguishable from checking nothing', () => {
  const out = renderSummary(JSON.stringify({ site: 'https://x', checked: 80, violations: [], notes: [] }), '0');
  assert.ok(out.length > 40, 'the summary must actually say something');
});

console.log('live-catalogue CI summary — a NEW breach must be visually separated from the known ones');

check('separates a NEW violation from the four tracked in BACKLOG #31', () => {
  const out = renderSummary(
    JSON.stringify({
      site: 'https://x',
      checked: 80,
      violations: [violation('wrt-water-damage-essentials', 'Known | CARSI'), violation('brand-new-wrt-course', 'New | CARSI')],
      notes: [],
    }),
    '1',
  );
  assert.match(out, /1 NEW — not previously tracked/);
  assert.match(out, /brand-new-wrt-course/);
  assert.match(out, /1 already tracked in BACKLOG #31/);
  assert.match(out, /wrt-water-damage-essentials/);
  // The NEW section must come FIRST — it is the thing a human must act on.
  assert.ok(out.indexOf('NEW — not previously tracked') < out.indexOf('already tracked'));
});

check('the known list annotates but NEVER suppresses — a known breach is still reported', () => {
  const out = renderSummary(
    JSON.stringify({
      site: 'https://x',
      checked: 80,
      violations: [...KNOWN_IN_BREACH].map((s) => violation(s, 'Known | CARSI')),
      notes: [],
    }),
    '1',
  );
  assert.match(out, /4 live course\(s\) carry banned IICRC discipline branding/);
  for (const slug of KNOWN_IN_BREACH) assert.ok(out.includes(slug), `${slug} must still appear`);
  assert.doesNotMatch(out, /all clean/);
});

check('reports the rule and the URL, so the reader can act without re-running anything', () => {
  const out = renderSummary(
    JSON.stringify({ site: 'https://x', checked: 80, violations: [violation('new-course', 'T | CARSI')], notes: [] }),
    '1',
  );
  assert.match(out, /title-acronym/);
  assert.match(out, /https:\/\/www\.carsi\.com\.au\/courses\/new-course/);
});

console.log('live-catalogue CI summary — "could not audit" must never read as a pass');

check('exit 2 says explicitly that it is NOT a pass, and names the reason', () => {
  const out = renderSummary(
    JSON.stringify({ site: 'https://x', checked: 0, violations: [], notes: [], error: 'sitemap fetch failed' }),
    '2',
  );
  assert.match(out, /NOT a pass/);
  assert.match(out, /sitemap fetch failed/);
  assert.doesNotMatch(out, /all clean/);
});

check('exit 2 with no reason calls the missing reason a defect rather than glossing it', () => {
  const out = renderSummary(JSON.stringify({ site: 'https://x', checked: 0, violations: [], notes: [] }), '2');
  assert.match(out, /NOT a pass/);
  assert.match(out, /no reason/);
});

console.log('live-catalogue CI summary — a broken guard must be visible, not silent');

check('unparseable output is reported as a guard defect, not rendered as empty', () => {
  const out = renderSummary('not json at all', '2');
  assert.match(out, /could not be parsed/);
  assert.match(out, /not json at all/);
  assert.doesNotMatch(out, /all clean/);
});

check('EMPTY output is reported too — the silent case', () => {
  const out = renderSummary('', '2');
  assert.match(out, /could not be parsed/);
  assert.match(out, /\(empty\)/);
});

check('an unexpected exit code is named rather than ignored', () => {
  const out = renderSummary(JSON.stringify({ site: 'https://x', checked: 0, violations: [], notes: [] }), '137');
  assert.match(out, /unexpected code/);
  assert.match(out, /137/);
  assert.doesNotMatch(out, /all clean/);
});

console.log('live-catalogue CI summary — audience notes are surfaced, never dropped');

check('renders notes without calling them violations', () => {
  const out = renderSummary(
    JSON.stringify({
      site: 'https://x',
      checked: 80,
      violations: [],
      notes: [{ slug: 'ppe-course', title: 'PPE for Technicians', url: 'https://x/c', hits: [{ rule: 'designation-phrase-audience', detail: 'x' }] }],
    }),
    '0',
  );
  assert.match(out, /audience-wording note/);
  assert.match(out, /does not block/);
  assert.match(out, /ppe-course/);
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed — the CI summary is not trustworthy until they pass.`);
  process.exit(1);
}
console.log('\n✓ the CI summary reports every outcome, and never renders a failure as clean.');
