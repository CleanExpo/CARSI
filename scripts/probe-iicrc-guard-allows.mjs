// Hostile probe of every allow branch in the IICRC terminology guard.
// Each case states what the guard MUST do. A case that disagrees is a bypass.
import { scanText } from './check-iicrc-terminology.mjs';

const F = 'app/(public)/fixture/page.tsx';

// [expectation, label, source]  expectation: 'BLOCK' | 'PASS'
// KNOWN-OPEN cases carry `known: true`. They are whole-line-allow bypasses on rules that
// pre-date the designation-rule work, so they are reported but do not fail this probe.
// Fixing them means giving those rules the same `neutralise` treatment, in a change
// against main rather than inside a release-gated branch.
const CASES = [
  // --- allow #1: "IICRC CEC" anywhere on the line exempts the "IICRC course" rule ---
  ['BLOCK', 'CEC token laundering a bare IICRC course claim',
    'Enrol in our IICRC courses today — CARSI is IICRC CEC Accredited.', true],
  ['BLOCK', 'CEC token in a comment laundering the same line',
    'const t = "Get our IICRC course"; // IICRC CEC Accredited provider', true],
  ['PASS', 'the compliant phrasing itself', 'Enrol in our IICRC CEC courses'],

  // --- allow #2: preposition context exempts "IICRC Approved School" ---
  ['BLOCK', 'CARSI claiming the status with a preposition elsewhere on the line',
    'CARSI is an IICRC Approved School — certification is obtained through an IICRC approved school.', true],
  ['PASS', 'the genuine third-person route fact',
    'IICRC certification is obtained through an IICRC approved school and examination.'],

  // --- allow #3: URL-slug branch of the designation rule ---
  ['BLOCK', 'slug token laundering prose on the same line',
    'title: "IICRC WRT course for CARSI students", slug: "x-iicrc-wrt"'],
  ['PASS', 'a genuine legacy slug alone', "href: '/courses/water-iicrc-wrt'"],

  // --- allow #3 (rewritten): certifications list ---
  ['PASS', "person's bare credential list",
    "certifications: ['IICRC WRT', 'IICRC ASD', 'IICRC FSRT'],"],
  ['BLOCK', 'string value instead of a list',
    'certifications: "IICRC WRT course for CARSI students"'],
  ['BLOCK', 'prose smuggled inside the list',
    "certifications: ['IICRC WRT course for CARSI students']"],
  ['BLOCK', 'valid list used to launder branding later on the line',
    "certifications: ['IICRC WRT'], tagline: 'IICRC ASD-aligned CARSI course'"],

  // --- non-vacuity anchors: these must always fire ---
  ['BLOCK', 'plain acronym branding', 'IICRC WRT training for Australian technicians'],
  ['BLOCK', 'discipline-aligned', 'An ASD-aligned drying course'],
];

let bad = 0;
let known = 0;
for (const [want, label, src, isKnown] of CASES) {
  const hits = scanText(F, src);
  const got = hits.length > 0 ? 'BLOCK' : 'PASS';
  const ok = got === want;
  if (!ok && isKnown) known++;
  else if (!ok) bad++;
  const tag = ok ? '  ok  ' : isKnown ? ' known' : 'BYPASS';
  console.log(`${tag}  want=${want} got=${got}  ${label}`);
  if (!ok) console.log(`          ${src}`);
}
if (known > 0) {
  console.log(`\n${known} known-open bypass(es) on pre-existing rules — see the handoff, not a regression.`);
}
if (bad > 0) {
  console.error(`\n✖ ${bad} NEW bypass(es) — a permitted token is exempting the rest of the line.`);
  process.exit(1);
}
console.log('\n✓ No new bypasses.');
