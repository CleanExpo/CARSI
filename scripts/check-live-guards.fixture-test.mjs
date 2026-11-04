#!/usr/bin/env node
/**
 * Planted-fault proof for the two live money-path guards (GP-676, GP-674).
 *
 * Unit tests prove each rule's logic; this proves the WHOLE guard, browser included, goes red
 * on each fault it exists for. A local fixture site plays carsi.com.au, each guard is run
 * against it exactly as the daily workflow runs it against production, and the exit code and
 * the reason are both asserted:
 *
 *   courses money path  clean                                        -> 0
 *                       priced class only on first screen (no link)  -> 0
 *                       no priced class and no CEC link on screen 1  -> 1  NO PRICED CLASS AND NO CEC LINK
 *                       CEC tab lists a class that is not approved   -> 1  NOT CEC-APPROVED
 *   buy path            clean (quick-enrol card AND a newsletter)    -> 0
 *                       card gone, newsletter email form still there -> 1  NO QUICK-ENROL CARD
 *                       http://127.1:8080/ and http://2130706433:8080/ in page text -> 1 LOCALHOST
 *
 * The clean runs are the positive controls: without them a fixture that is broken in some other
 * way would make every "red" meaningless.
 *
 * Needs Playwright's Chromium (the workflow installs it before this step).
 *   node scripts/check-live-guards.fixture-test.mjs
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const REGISTRY = JSON.parse(readFileSync(here('../data/seed/cec-approvals.json'), 'utf8'));
const APPROVED = REGISTRY.approvals.filter((a) => a.status === 'approved').map((a) => a.slug);
const CEC_SLUGS = APPROVED.slice(0, 3);
/** A real live class that is NOT in the CEC registry: the planted rule-2 fault. */
const NOT_CEC = 'water-damage-essentials';
if (APPROVED.includes(NOT_CEC)) throw new Error(`fixture broken: ${NOT_CEC} is in the registry`);

const PAID_PATHS = [
  '/courses/introduction-to-improving-indoor-air-quality-after-water-damage',
  '/courses/introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
  '/courses/job-safety-and-environmental-analysis-jsea-course',
];

// ---- fixture pages -------------------------------------------------------------------------

const doc = (body) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>Fixture | CARSI</title>` +
  `<meta name="viewport" content="width=device-width, initial-scale=1">` +
  `<style>body{margin:0;font:16px sans-serif;color:#111;background:#fff}` +
  `.hero{min-height:1400px}.card{display:block;padding:8px}</style></head><body>${body}</body></html>`;

const card = (slug, text) => `<a class="card" href="/courses/${slug}">${text}</a>`;
const nav = `<nav><a href="/">Home</a> <a href="/courses">Courses</a> <a href="/pricing">Pricing</a></nav>`;

function coursesPage({ cecLink, pricedOnFirstScreen }) {
  const first = [
    nav,
    pricedOnFirstScreen ? card(CEC_SLUGS[0], '$29 1 CEC First class') : '',
    card('free-intro-fixture', 'Free Intro'),
    `<a href="#catalogue">Browse the catalogue</a>`,
    cecLink ? `<a href="/courses?discipline=iicrc-cec#catalogue">CEC Accredited courses</a>` : '',
  ].join(' ');
  // Priced classes exist BELOW the fold in every variant: the rule is about the first screen.
  return doc(
    `<div class="hero">${first}</div>` +
      `<div id="catalogue"><div role="tablist"><button role="tab" aria-selected="true">All</button></div>` +
      `<span>4 courses</span><section aria-label="Course results">` +
      CEC_SLUGS.map((s) => card(s, '$29 1 CEC Class')).join('') +
      card('free-intro-fixture', 'Free Intro') +
      `</section></div>`
  );
}

function cecPage({ plantNonCec }) {
  const slugs = plantNonCec ? [...CEC_SLUGS, NOT_CEC] : CEC_SLUGS;
  return doc(
    `<div id="catalogue"><div role="tablist"><button role="tab" aria-selected="false">All</button>` +
      `<button role="tab" aria-selected="true">IICRC CEC</button></div>` +
      `<span>${slugs.length} courses</span><section aria-label="Course results">` +
      slugs.map((s) => card(s, '$29 1 CEC Class') + card(s, 'View course')).join('') +
      `</section><label>Rows per page <select aria-label="Rows per page">` +
      `<option value="12">12</option><option value="all">All</option></select></label></div>`
  );
}

const field = 'style="color:#111;background:#fff;border:1px solid #555;display:block"';
const quickEnrolCard =
  `<form data-quick-enrol-card="" style="background:#fff;color:#111;padding:8px">` +
  `<label for="guest-full-name" style="color:#111">Full name</label>` +
  `<input id="guest-full-name" ${field}>` +
  `<label for="guest-email" style="color:#111">Email</label>` +
  `<input id="guest-email" type="email" ${field}></form>`;
const newsletter =
  `<form class="newsletter"><label for="nl" style="color:#111">Newsletter</label>` +
  `<input id="nl" type="email" name="email" ${field}></form>`;

function buyPage(path, scenario) {
  if (PAID_PATHS.includes(path)) {
    return doc(
      `${nav}<h1>Paid course</h1>${scenario === 'noCard' ? '' : quickEnrolCard}${newsletter}`
    );
  }
  if (path === '/' && scenario === 'loopback') {
    return doc(
      `${nav}<a href="http://127.1:8080/learn/x">Start</a> <a href="http://2130706433:8080/">Go</a>`
    );
  }
  return doc(`${nav}<h1>${path}</h1>`);
}

// ---- server --------------------------------------------------------------------------------

let scenario = 'clean';
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://fixture');
  if (u.pathname === '/api/auth/logout') {
    res.writeHead(302, { Location: '/login' });
    return res.end();
  }
  let html;
  if (scenario.startsWith('courses:') && u.pathname === '/courses') {
    html =
      u.searchParams.get('discipline') === 'iicrc-cec'
        ? cecPage({ plantNonCec: scenario === 'courses:nonCec' })
        : coursesPage({
            cecLink: scenario !== 'courses:noPricedNoLink' && scenario !== 'courses:pricedOnly',
            pricedOnFirstScreen: scenario === 'courses:pricedOnly',
          });
  } else {
    html = buyPage(u.pathname, scenario.replace(/^buy:/, ''));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${server.address().port}`;

function runGuard(script) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [here(script)], {
      env: { ...process.env, CARSI_SITE: SITE },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}

// ---- cases ---------------------------------------------------------------------------------

const CASES = [
  ['courses:clean', './check-live-courses-money-path.mjs', 0, /passed/],
  ['courses:pricedOnly', './check-live-courses-money-path.mjs', 0, /passed/],
  [
    'courses:noPricedNoLink',
    './check-live-courses-money-path.mjs',
    1,
    /NO PRICED CLASS AND NO CEC LINK/,
  ],
  [
    'courses:nonCec',
    './check-live-courses-money-path.mjs',
    1,
    new RegExp(`NOT CEC-APPROVED .*${NOT_CEC}`),
  ],
  ['buy:clean', './check-live-buy-path.mjs', 0, /passed/],
  ['buy:noCard', './check-live-buy-path.mjs', 1, /NO QUICK-ENROL CARD/],
  [
    'buy:loopback',
    './check-live-buy-path.mjs',
    1,
    /127\.1:8080[\s\S]*2130706433:8080|2130706433:8080[\s\S]*127\.1:8080/,
  ],
];

let failures = 0;
try {
  for (const [name, script, wantCode, wantText] of CASES) {
    scenario = name;
    const { code, out } = await runGuard(script);
    const ok = code === wantCode && wantText.test(out);
    if (!ok) failures += 1;
    const reason = out.split('\n').filter((l) => l.startsWith('  - '));
    console[ok ? 'log' : 'error'](
      `  ${ok ? '✓' : '✗'} ${name}: exit ${code} (want ${wantCode})` +
        (ok
          ? reason.map((l) => `\n      ${l.trim()}`).join('')
          : `\n${out.replace(/^/gm, '      ')}`)
    );
  }
} finally {
  server.close();
}

if (failures) {
  console.error(`✗ ${failures} planted-fault case(s) did not behave`);
  process.exit(1);
}
console.log('✓ every planted fault turned the guard red, and the clean fixture stayed green');
