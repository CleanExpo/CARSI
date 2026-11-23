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
 * Checks, per viewport (exit 1 when any fails, exit 2 when the proof could not run, exit 3
 * "BLOCKED: library did not load" when gtag.js never arrived with a 2xx response and a body;
 * then B2-B4, C and D are reported as skipped, not passed, because nothing could be sent):
 *   A. first load with an email, a token and a campaign tag in the address: banner visible,
 *      zero Google Analytics / Tag Manager requests;
 *   B. "Accept analytics": the library loads (2xx with a body) and a page_view leaves whose
 *      address is the page plus the campaign tag only (no email, no token);
 *   C. a private page (/login) after accepting: no collection request about it;
 *   D. "Cookie settings" then "Reject optional": no Google request after the choice, and the
 *      _ga cookies are gone;
 *   E. a fresh visitor who presses "Reject optional" first: zero Google requests across two pages.
 *
 * Writes report.json and screenshots to PROOF_OUT (default: ../carsi-ga4-consent-proof beside the
 * repository). Runs `prisma generate` before the build and stops with exit 2 if it fails or writes
 * no client. Refuses to run when any .env file other than .env.example exists, so the build never
 * reads real secrets.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

import {
  evaluateAccept,
  evaluatePrivatePage,
  isGoogle,
  isLibrary,
  prismaPreflight,
  skipped,
  verdict,
} from './consent-checks.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(process.env.PROOF_OUT || join(ROOT, '..', 'carsi-ga4-consent-proof'));
const NEXT_BIN = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const PRISMA_BIN = join(ROOT, 'node_modules', 'prisma', 'build', 'index.js');

const LANDING =
  '/about?email=jane.proof%40example.invalid&token=proof-token-abc123&utm_source=proofcampaign';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

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
  // The build imports the generated Prisma client; without it `next build` fails deep in its
  // output. Generate it first, with the same pinned environment, and stop with a plain message.
  console.log('build: prisma generate ...');
  const pre = prismaPreflight(ROOT, () =>
    spawnSync(process.execPath, [PRISMA_BIN, 'generate'], {
      cwd: ROOT,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: pinnedEnv(),
    })
  );
  if (!pre.ok) {
    console.error(`PROOF COULD NOT RUN: ${pre.message}`);
    process.exit(2);
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
  const record = (c) => {
    checks.push(c);
    console.log(`${c.status.toUpperCase()} [${vp.name}] ${c.id}: ${c.detail}`);
  };
  const check = (id, pass, detail) =>
    record({ id, status: pass ? 'pass' : 'fail', pass: Boolean(pass), detail });
  const shots = {};
  const shot = async (page, key) => {
    const file = join(OUT, `${vp.name}-${key}.png`);
    await page.screenshot({ path: file, fullPage: false });
    shots[key] = file;
  };

  // ---- Visitor 1: lands, accepts, visits a private page, then withdraws.
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const log = [];
  const entryOf = new Map();
  const pending = new Set();
  let phase = 'before-choice';
  ctx.on('request', (req) => {
    if (isGoogle(req.url())) {
      const entry = {
        phase,
        url: req.url(),
        body: req.postData() ?? '',
        library: isLibrary(req.url()),
      };
      entryOf.set(req, entry);
      log.push(entry);
    }
  });
  // B1 needs to know whether the library actually arrived, not only that it was asked for.
  ctx.on('requestfailed', (req) => {
    const entry = entryOf.get(req);
    if (entry) entry.failure = req.failure()?.errorText ?? 'request failed';
  });
  ctx.on('requestfinished', (req) => {
    const entry = entryOf.get(req);
    if (!entry?.library) return;
    const task = (async () => {
      const res = await req.response();
      entry.status = res?.status();
      entry.bodyBytes = res ? (await res.body().catch(() => Buffer.alloc(0))).length : 0;
    })().finally(() => pending.delete(task));
    pending.add(task);
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
  await Promise.all([...pending]);
  const accepted = log.filter((r) => r.phase === 'after-accept');
  const acceptChecks = evaluateAccept(accepted, `${base}/about?utm_source=proofcampaign`);
  acceptChecks.forEach(record);
  const libraryOk = acceptChecks[0].status === 'pass';

  if (libraryOk) {
    await withdrawFlow();
  } else {
    // Nothing could be sent without the library, so C and D would pass (or fail) vacuously.
    ['C1-no-hit-about-private-page', 'D1-zero-google-after-withdraw', 'D2-ga-cookies-deleted']
      .map(skipped)
      .forEach(record);
  }
  await ctx.close();

  async function withdrawFlow() {
    phase = 'private-page';
    await page.goto(`${base}/login?email=jane.proof%40example.invalid`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(3000);
    record(
      evaluatePrivatePage(
        log.filter((r) => r.phase === 'private-page'),
        { libraryLoaded: true }
      )
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
  }

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
  const outcome = verdict(checks, error);
  const report = {
    ticket: 'GP-731',
    head,
    dirtyTree: dirty,
    base,
    generatedAt: new Date().toISOString(),
    error,
    passed: outcome.code === 0,
    exitCode: outcome.code,
    checkCount: checks.length,
    results,
    serverLogTail: serverLog.slice(-4000),
  };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`report: ${join(OUT, 'report.json')}`);
  (outcome.code === 0 ? console.log : console.error)(outcome.label);
  process.exit(outcome.code);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
