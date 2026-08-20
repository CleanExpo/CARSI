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

// A non-array `violations` makes `.length` undefined, which is falsy — so a breach reported in
// the wrong shape reads as "found nothing" everywhere downstream. Each shape is pinned because
// `|| []` catches only null/undefined and waves every truthy non-array straight through.
for (const [label, shape] of [
  ['an object', { slug: 'brand-new-wrt-course', title: 'WRT Course | CARSI' }],
  ['a string', 'brand-new-wrt-course'],
  ['a number', 1],
  ['a bare true', true],
  ['null', null],
  ['missing', undefined],
]) {
  check(`violations arriving as ${label} is a malformed report, never a clean run`, () => {
    const out = renderSummary(
      JSON.stringify({ site: 'https://x', checked: 80, violations: shape, notes: [] }),
      '0',
    );
    assert.doesNotMatch(out, /all clean/, `violations as ${label} must not render as clean`);
    assert.match(out, /malformed/);
  });
}

check('notes arriving in the wrong shape is malformed too — notes are reported, not decorative', () => {
  const out = renderSummary(
    JSON.stringify({ site: 'https://x', checked: 80, violations: [], notes: { slug: 'x' } }),
    '0',
  );
  assert.doesNotMatch(out, /all clean/);
  assert.match(out, /malformed/);
});

check('the malformed branch names the shape it received, so the run is diagnosable without the artefact', () => {
  const out = renderSummary(
    JSON.stringify({ site: 'https://x', checked: 80, violations: { slug: 'x' }, notes: [] }),
    '0',
  );
  assert.match(out, /`violations`: object/);
  assert.match(out, /`notes`: array/);
});

// A renderer that THROWS has not reported. The shape checks above dereference `report`, so a
// root that is not an object kills them before they can speak — and `JSON.parse('null')`
// returns null, which `typeof` calls an object. The human is then handed a stack trace where
// the guard defect should have been, which is the same outcome as a summary that renders
// nothing. Each root shape is pinned separately because only `null` actually crashed.
for (const [label, raw] of [
  ['null', 'null'],
  ['a bare string', '"brand-new-wrt-course"'],
  ['a bare number', '80'],
  ['a bare true', 'true'],
  ['a root array', '[{"slug":"brand-new-wrt-course"}]'],
]) {
  check(`a report whose root is ${label} is reported as malformed, never thrown`, () => {
    let out;
    assert.doesNotThrow(() => {
      out = renderSummary(raw, '0');
    }, `root as ${label} must not throw`);
    assert.doesNotMatch(out, /all clean/);
    assert.match(out, /malformed/);
  });
}

// Right container, wrong contents: `violations` is a genuine array but carries an entry that is
// not an object. `v.slug` in the NEW-versus-known split throws on it — and it throws precisely
// on the run where a real breach IS present, so the crash lands at the worst possible moment.
for (const [label, entry] of [
  ['null', null],
  ['a string', 'brand-new-wrt-course'],
  ['a number', 7],
  ['an array', ['brand-new-wrt-course']],
]) {
  check(`a violations entry that is ${label} is reported as malformed, never thrown`, () => {
    let out;
    assert.doesNotThrow(() => {
      out = renderSummary(
        JSON.stringify({
          site: 'https://x',
          checked: 80,
          violations: [entry, violation('brand-new-wrt-course', 'WRT Course | CARSI')],
          notes: [],
        }),
        '1',
      );
    }, `a violations entry of ${label} must not throw`);
    assert.match(out, /malformed/);
  });
}

check('a notes entry that is not an object is malformed too — notes are dereferenced exactly like violations', () => {
  let out;
  assert.doesNotThrow(() => {
    out = renderSummary(
      JSON.stringify({ site: 'https://x', checked: 80, violations: [], notes: [null] }),
      '0',
    );
  });
  assert.doesNotMatch(out, /all clean/);
  assert.match(out, /malformed/);
});

// `hits` is a FIELD of a valid entry, so the entry check above cannot reach it, and `.map` on a
// non-array throws. The throw happens INSIDE the render loop, so it would take every other breach
// in the same report down with it — a worse outcome than the crash that prompted the entry check.
for (const [label, hits] of [
  ['an object', { rule: 'title-acronym', detail: 'WRT' }],
  ['a string', 'title-acronym'],
  ['a number', 3],
  ['null', null],
  ['missing', undefined],
]) {
  check(`a violation whose \`hits\` is ${label} is still REPORTED, never thrown`, () => {
    let out;
    assert.doesNotThrow(() => {
      out = renderSummary(
        JSON.stringify({
          site: 'https://x',
          checked: 80,
          violations: [{ slug: 'brand-new-wrt-course', title: 'WRT Course', url: 'https://x/c', hits }],
          notes: [],
        }),
        '1',
      );
    }, `hits as ${label} must not throw`);
    // The breach itself must survive: suppressing a real live breach because the REASON for it
    // arrived in the wrong shape would be the defect this whole file exists to prevent.
    assert.match(out, /brand-new-wrt-course/, `hits as ${label} must still name the course`);
    assert.match(out, /https:\/\/x\/c/, `hits as ${label} must still give the URL`);
    assert.doesNotMatch(out, /all clean/);
  });
}

check('a malformed `hits` does not hide the OTHER breaches in the same report', () => {
  const out = renderSummary(
    JSON.stringify({
      site: 'https://x',
      checked: 80,
      violations: [
        { slug: 'broken-hits-course', title: 'Broken', url: 'https://x/broken', hits: 'not-an-array' },
        violation('second-new-course', 'Second | CARSI'),
      ],
      notes: [],
    }),
    '1',
  );
  assert.match(out, /broken-hits-course/);
  assert.match(out, /second-new-course/, 'the second breach must survive the first one being malformed');
});

check('a single malformed hit does not discard the valid hits beside it', () => {
  const out = renderSummary(
    JSON.stringify({
      site: 'https://x',
      checked: 80,
      violations: [
        {
          slug: 'brand-new-wrt-course',
          title: 'WRT Course',
          url: 'https://x/c',
          hits: [null, { rule: 'title-acronym', detail: 'WRT' }],
        },
      ],
      notes: [],
    }),
    '1',
  );
  assert.match(out, /malformed hit/);
  assert.match(out, /title-acronym/, 'the valid hit beside the malformed one must still render');
});

check('an empty-object entry is accepted — the check rejects shapes that throw, not fields that are absent', () => {
  const out = renderSummary(
    JSON.stringify({ site: 'https://x', checked: 80, violations: [{}], notes: [] }),
    '1',
  );
  assert.doesNotMatch(out, /malformed/);
  assert.match(out, /live course\(s\) carry banned/);
});

check('exit 0 with violations is a guard defect, never "all clean" — the report outranks the code', () => {
  const out = renderSummary(
    JSON.stringify({
      site: 'https://x',
      checked: 80,
      violations: [violation('brand-new-wrt-course', 'WRT Course | CARSI')],
      notes: [],
    }),
    '0',
  );
  assert.doesNotMatch(out, /all clean/, 'a contradicted audit must never render as clean');
  assert.match(out, /contradicted itself/);
  assert.ok(out.includes('brand-new-wrt-course'), 'the violation it reported must still be shown');
});

check('a genuinely clean audit still renders clean — the contradiction branch is not a catch-all', () => {
  const out = renderSummary(JSON.stringify({ site: 'https://x', checked: 80, violations: [], notes: [] }), '0');
  assert.match(out, /80 live courses checked, all clean/);
  assert.doesNotMatch(out, /contradicted itself/);
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
