#!/usr/bin/env node
/**
 * GP-731 real-browser proof: carsi.com.au sends nothing to Google before the visitor chooses.
 *
 * Builds the site (unless PROOF_SKIP_BUILD=1 and a build exists), starts `next start` on a free
 * local port, and drives the real Google library in headless Chromium at desktop (1440x900) and
 * phone (390x844) size. Every request to a Google Analytics or Tag Manager host is recorded.
 * Collection requests are recorded and then aborted in the browser, so no hit reaches the live
 * property; the library file itself is fetched for real.
 *
 * Checks, per viewport (exit 1 when any fails, exit 2 when the proof could not run):
 *   A. first load with an email, a token and a campaign tag in the address: banner visible,
 *      zero Google Analytics / Tag Manager requests;
 *   B. "Accept analytics": the library loads and a page_view leaves whose address is the page
 *      plus the campaign tag only (no email, no token);
 *   C. a private page (/login) after accepting: no collection request about it;
 *   D. "Cookie settings" then "Reject optional": no Google request after the choice, and the
 *      _ga cookies are gone;
 *   E. a fresh visitor who presses "Reject optional" first: zero Google requests across two pages.
 *
 * Writes report.json and screenshots to PROOF_OUT (default: ../carsi-ga4-consent-proof beside the
 * repository). Refuses to run when any .env file other than .env.example exists, so the build
 * never reads real secrets.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(process.env.PROOF_OUT || join(ROOT, '..', 'carsi-ga4-consent-proof'));
const NEXT_BIN = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

const GOOGLE_HOST =
  /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|googleadservices\.com|googlesyndication\.com)$/;
const GOOGLE_SITE = /^(?:[a-z0-9-]+\.)?google\.(?:com|[a-z]{2,3}|com?\.[a-z]{2})$/;
const LANDING =
  '/about?email=jane.proof%40example.invalid&token=proof-token-abc123&utm_source=proofcampaign';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

function isGoogle(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return GOOGLE_HOST.test(host) || GOOGLE_SITE.test(host);
  } catch {
    return false;
  }
}

function isLibrary(url) {
  try {
    const u = new URL(url);
    return u.hostname.endsWith('googletagmanager.com') && u.pathname.startsWith('/gtag/');
  } catch {
    return false;
  }
}

/** Every event in a collection request: the URL fields merged with each body line. */
function eventsOf(url, body) {
  const shared = Object.fromEntries(new URL(url).searchParams);
  const lines = (body || '').split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [shared];
  return lines.map((line) => ({ ...shared, ...Object.fromEntries(new URLSearchParams(line)) }));
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolvePort(port));
    });
  });
}

async function waitForServer(base, child, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`next start exited with ${child.exitCode}`);
    try {
      const res = await fetch(`${base}/about`);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server did not come up in time');
}

function refuseOnEnvFiles() {
  const envFiles = readdirSync(ROOT).filter((f) => f.startsWith('.env') && f !== '.env.example');
  if (envFiles.length > 0) {
    console.error(
      `REFUSED: env files present (${envFiles.join(', ')}); the proof builds without secrets.`
    );
    process.exit(2);
  }
}

function build() {
  if (process.env.PROOF_SKIP_BUILD === '1' && existsSync(join(ROOT, '.next', 'BUILD_ID'))) {
    console.log('build: skipped (PROOF_SKIP_BUILD=1, existing .next)');
    return;
  }
  console.log('build: next build ...');
  const res = spawnSync(process.execPath, [NEXT_BIN, 'build'], {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...pinnedEnv(), NODE_ENV: 'production' },
  });
  if (res.status !== 0) {
    console.error(`build failed: exit ${res.status}`);
    process.exit(2);
  }
}

/**
 * The production server refuses to boot without these names (src/lib/server/boot-env.ts). The
 * proof gives it obvious placeholders, never real values: the database address points at a closed
 * local port, so any page that needs data fails rather than reaching a real database, and no
 * payment, AI or session call can succeed with them.
 */
const BOOT_PLACEHOLDERS = {
  DATABASE_URL: 'postgresql://proof:proof@127.0.0.1:1/proof_unreachable',
  STRIPE_SECRET_KEY: 'proof-placeholder-not-a-key',
  STRIPE_WEBHOOK_SECRET: 'proof-placeholder-not-a-secret',
  OPENROUTER_API_KEY: 'proof-placeholder-not-a-key',
  JWT_SECRET: 'proof-placeholder-session-secret-not-real',
};

/** Only what the build needs to run; never a copy of the caller's whole environment. */
function pinnedEnv() {
  const keep = ['PATH', 'HOME', 'TMPDIR', 'LANG'];
  const env = Object.fromEntries(
    keep.filter((k) => process.env[k]).map((k) => [k, process.env[k]])
  );
  env.NEXT_TELEMETRY_DISABLED = '1';
  return env;
}

async function runViewport(browser, base, vp) {
  const checks = [];
  const check = (id, pass, detail) => {
    checks.push({ id, pass: Boolean(pass), detail });
    console.log(`${pass ? 'PASS' : 'FAIL'} [${vp.name}] ${id}: ${detail}`);
  };
  const shots = {};
  const shot = async (page, key) => {
    const file = join(OUT, `${vp.name}-${key}.png`);
    await page.screenshot({ path: file, fullPage: false });
    shots[key] = file;
  };

  // ---- Visitor 1: lands, accepts, visits a private page, then withdraws.
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const log = [];
  let phase = 'before-choice';
  ctx.on('request', (req) => {
    if (isGoogle(req.url())) {
      log.push({
        phase,
        url: req.url(),
        body: req.postData() ?? '',
        library: isLibrary(req.url()),
      });
    }
  });
  await ctx.route(
    (url) => isGoogle(url.href) && !isLibrary(url.href),
    (route) => route.abort('blockedbyclient')
  );
  const page = await ctx.newPage();
  await page.goto(`${base}${LANDING}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const banner = page.getByRole('region', { name: 'Cookie settings' });
  check('A1-banner-visible', await banner.isVisible(), 'consent banner shown on first visit');
  check(
    'A2-two-choices',
    (await page.getByRole('button', { name: 'Reject optional' }).isVisible()) &&
      (await page.getByRole('button', { name: 'Accept analytics' }).isVisible()),
    '"Reject optional" and "Accept analytics" both visible'
  );
  await shot(page, '1-first-visit-banner');
  const before = log.filter((r) => r.phase === 'before-choice');
  check(
    'A3-zero-google-before-choice',
    before.length === 0,
    `${before.length} Google request(s) before a choice${before.length ? `: ${before.map((r) => r.url.slice(0, 160)).join(' | ')}` : ''}`
  );

  phase = 'after-accept';
  await page.getByRole('button', { name: 'Accept analytics' }).click();
  await page
    .waitForRequest((req) => isGoogle(req.url()) && !isLibrary(req.url()), { timeout: 15_000 })
    .catch(() => null);
  await page.waitForTimeout(2000);
  await shot(page, '2-after-accept');
  const accepted = log.filter((r) => r.phase === 'after-accept');
  const libs = accepted.filter((r) => r.library);
  const collects = accepted.filter((r) => !r.library);
  check(
    'B1-library-after-accept',
    libs.length > 0,
    `${libs.length} library request(s): ${libs.map((r) => r.url).join(' ')}`
  );
  const pageViews = collects
    .flatMap((r) => eventsOf(r.url, r.body))
    .filter((e) => e.en === 'page_view');
  check(
    'B2-page-view-after-accept',
    pageViews.length > 0,
    `${pageViews.length} page_view event(s) left the browser`
  );
  const expected = `${base}/about?utm_source=proofcampaign`;
  check(
    'B3-address-scrubbed',
    pageViews.length > 0 && pageViews.every((e) => e.dl === expected),
    `sent dl: ${JSON.stringify(pageViews.map((e) => e.dl))}; expected ${expected}`
  );
  const leaked = collects.filter((r) =>
    /jane|proof-token|example\.invalid|token=/i.test(decodeURIComponent(`${r.url} ${r.body}`))
  );
  check(
    'B4-no-personal-data-in-any-hit',
    leaked.length === 0,
    `${leaked.length} hit(s) carrying the planted email/token`
  );

  phase = 'private-page';
  await page.goto(`${base}/login?email=jane.proof%40example.invalid`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const privateHits = log
    .filter((r) => r.phase === 'private-page' && !r.library)
    .flatMap((r) => eventsOf(r.url, r.body))
    .filter((e) => (e.dl || '').includes('/login') || (e.dr || '').includes('/login'));
  check(
    'C1-no-hit-about-private-page',
    privateHits.length === 0,
    `${privateHits.length} hit(s) about /login`
  );
  const cookiesBefore = (await ctx.cookies()).filter(
    (c) => c.name === '_ga' || c.name.startsWith('_ga_')
  );

  await page.goto(`${base}/privacy`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Cookie settings' }).first().click();
  await shot(page, '3-cookie-settings-reopened');
  phase = 'after-withdraw';
  await page.getByRole('button', { name: 'Reject optional' }).click();
  const withdrawAt = log.length;
  await page.goto(`${base}/about?utm_source=proofcampaign`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const afterWithdraw = log.slice(withdrawAt);
  check(
    'D1-zero-google-after-withdraw',
    afterWithdraw.length === 0,
    `${afterWithdraw.length} Google request(s) after "Reject optional"`
  );
  const cookiesAfter = (await ctx.cookies()).filter(
    (c) => c.name === '_ga' || c.name.startsWith('_ga_')
  );
  check(
    'D2-ga-cookies-deleted',
    cookiesBefore.length > 0 && cookiesAfter.length === 0,
    `_ga cookies before withdraw: ${cookiesBefore.length}, after: ${cookiesAfter.length}`
  );
  await ctx.close();

  // ---- Visitor 2: rejects straight away.
  const ctx2 = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const log2 = [];
  ctx2.on('request', (req) => {
    if (isGoogle(req.url())) log2.push(req.url());
  });
  await ctx2.route(
    (url) => isGoogle(url.href),
    (route) => route.abort('blockedbyclient')
  );
  const page2 = await ctx2.newPage();
  await page2.goto(`${base}${LANDING}`, { waitUntil: 'networkidle' });
  await page2.getByRole('button', { name: 'Reject optional' }).click();
  await page2.waitForTimeout(2000);
  await shot(page2, '4-after-reject');
  await page2.goto(`${base}/privacy`, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(3000);
  check(
    'E1-zero-google-after-reject',
    log2.length === 0,
    `${log2.length} Google request(s) across two pages after "Reject optional"`
  );
  check(
    'E2-banner-stays-closed',
    !(await page2.getByRole('region', { name: 'Cookie settings' }).isVisible()),
    'banner does not return on the next page'
  );
  await page2.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page2.waitForTimeout(800);
  await shot(page2, '5-footer-cookie-settings');
  await ctx2.close();

  return { viewport: vp, checks, screenshots: shots, requests: log, rejectVisitorRequests: log2 };
}

async function main() {
  refuseOnEnvFiles();
  mkdirSync(OUT, { recursive: true });
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).stdout.trim();
  const dirty =
    spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim() !==
    '';
  build();

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    [NEXT_BIN, 'start', '-p', String(port), '-H', '127.0.0.1'],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...pinnedEnv(), ...BOOT_PLACEHOLDERS, NODE_ENV: 'production' },
    }
  );
  let serverLog = '';
  server.stdout.on('data', (d) => (serverLog += d));
  server.stderr.on('data', (d) => (serverLog += d));

  const results = [];
  let error = null;
  let browser;
  try {
    await waitForServer(base, server);
    browser = await chromium.launch();
    for (const vp of VIEWPORTS) results.push(await runViewport(browser, base, vp));
  } catch (err) {
    error = String(err && err.stack ? err.stack : err);
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
  }

  const checks = results.flatMap((r) => r.checks);
  const report = {
    ticket: 'GP-731',
    head,
    dirtyTree: dirty,
    base,
    generatedAt: new Date().toISOString(),
    error,
    passed: !error && checks.length > 0 && checks.every((c) => c.pass),
    checkCount: checks.length,
    results,
    serverLogTail: serverLog.slice(-4000),
  };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`report: ${join(OUT, 'report.json')}`);
  if (error) {
    console.error(`PROOF COULD NOT RUN: ${error}`);
    process.exit(2);
  }
  console.log(
    `${report.passed ? 'PROOF PASSED' : 'PROOF FAILED'}: ${checks.filter((c) => c.pass).length}/${checks.length} checks`
  );
  process.exit(report.passed ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
