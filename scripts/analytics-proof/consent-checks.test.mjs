/**
 * Non-vacuity tests for the GP-731 consent proof's check logic (GP-750 follow-up).
 *
 * A verification run had gtag.js blocked by the proxy (net::ERR_TUNNEL_CONNECTION_FAILED), yet
 * B1 passed on the bare request, and B4 and C1 passed because nothing was sent at all. These
 * fixtures replay that network log and assert the proof now reports it as BLOCKED, never as a
 * pass.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  evaluateAccept,
  evaluatePrivatePage,
  prismaPreflight,
  verdict,
} from './consent-checks.mjs';

const BASE = 'http://127.0.0.1:4000';
const EXPECTED_DL = `${BASE}/about?utm_source=proofcampaign`;
const LIB_URL = 'https://www.googletagmanager.com/gtag/js?id=G-PROOF000';

const lib = (outcome) => ({
  phase: 'after-accept',
  url: LIB_URL,
  body: '',
  library: true,
  ...outcome,
});
const collect = (params, phase = 'after-accept') => ({
  phase,
  url: `https://region1.google-analytics.com/g/collect?v=2&tid=G-PROOF000&${new URLSearchParams(params)}`,
  body: '',
  library: false,
  failure: 'net::ERR_BLOCKED_BY_CLIENT',
});

// The verification run: the library request left, the proxy refused it, nothing else followed.
const TUNNEL_FAILED = [lib({ failure: 'net::ERR_TUNNEL_CONNECTION_FAILED' })];
const LOADED = lib({ status: 200, bodyBytes: 98_765 });
const CLEAN_PAGE_VIEW = collect({ en: 'page_view', dl: EXPECTED_DL });

const byId = (checks, id) => checks.find((c) => c.id.startsWith(id));

test('B1: a library request that failed with a net error does not pass', () => {
  const b1 = byId(evaluateAccept(TUNNEL_FAILED, EXPECTED_DL), 'B1');
  assert.equal(b1.pass, false);
  assert.equal(b1.status, 'blocked');
  assert.match(b1.detail, /ERR_TUNNEL_CONNECTION_FAILED/);
});

test('B1: a non-2xx response or an empty body does not pass', () => {
  for (const outcome of [
    { status: 404, bodyBytes: 120 },
    { status: 302, bodyBytes: 0 },
    { status: 200, bodyBytes: 0 },
    {}, // the request left and nothing was ever recorded about its response
  ]) {
    const b1 = byId(evaluateAccept([lib(outcome)], EXPECTED_DL), 'B1');
    assert.equal(b1.pass, false, `outcome ${JSON.stringify(outcome)} must not satisfy B1`);
  }
});

test('B1: a 2xx response with a body passes', () => {
  const b1 = byId(evaluateAccept([LOADED, CLEAN_PAGE_VIEW], EXPECTED_DL), 'B1');
  assert.equal(b1.pass, true);
  assert.equal(b1.status, 'pass');
});

test('B4 and C1 are not reported as passes when the library never loaded', () => {
  const accept = evaluateAccept(TUNNEL_FAILED, EXPECTED_DL);
  const b4 = byId(accept, 'B4');
  assert.equal(b4.pass, false);
  assert.equal(b4.status, 'skipped');
  for (const id of ['B2', 'B3']) assert.equal(byId(accept, id).status, 'skipped');

  const c1 = evaluatePrivatePage([], { libraryLoaded: false });
  assert.equal(c1.pass, false);
  assert.equal(c1.status, 'skipped');
});

test('verdict: library did not load is BLOCKED with exit 3, not a pass or a plain failure', () => {
  const checks = [
    { id: 'A3-zero-google-before-choice', pass: true, status: 'pass', detail: '' },
    ...evaluateAccept(TUNNEL_FAILED, EXPECTED_DL),
    evaluatePrivatePage([], { libraryLoaded: false }),
  ];
  const v = verdict(checks, null);
  assert.equal(v.code, 3);
  assert.match(v.label, /^BLOCKED: library did not load/);
});

test('verdict: a real failure still exits 1 even when another viewport was blocked', () => {
  const checks = [
    { id: 'A3-zero-google-before-choice', pass: false, status: 'fail', detail: '' },
    ...evaluateAccept(TUNNEL_FAILED, EXPECTED_DL),
  ];
  assert.equal(verdict(checks, null).code, 1);
});

test('loaded library and a clean page_view: B1-B4 and C1 pass, verdict 0', () => {
  const accept = evaluateAccept([LOADED, CLEAN_PAGE_VIEW], EXPECTED_DL);
  const c1 = evaluatePrivatePage([collect({ en: 'scroll', dl: EXPECTED_DL }, 'private-page')], {
    libraryLoaded: true,
  });
  for (const c of [...accept, c1]) assert.equal(c.status, 'pass', `${c.id}: ${c.detail}`);
  assert.equal(verdict([...accept, c1], null).code, 0);
});

test('loaded library: a planted email in a hit fails B4, and a /login hit fails C1', () => {
  const leaky = collect({ en: 'page_view', dl: `${BASE}/about?email=jane.proof@example.invalid` });
  const b4 = byId(evaluateAccept([LOADED, leaky], EXPECTED_DL), 'B4');
  assert.equal(b4.status, 'fail');
  const c1 = evaluatePrivatePage(
    [collect({ en: 'page_view', dl: `${BASE}/login` }, 'private-page')],
    {
      libraryLoaded: true,
    }
  );
  assert.equal(c1.status, 'fail');
  assert.equal(verdict([b4, c1], null).code, 1);
});

test('prismaPreflight: runs prisma generate and fails fast with a clear message', () => {
  const root = mkdtempSync(join(tmpdir(), 'consent-proof-prisma-'));
  try {
    const failing = prismaPreflight(root, () => ({ status: 1 }));
    assert.equal(failing.ok, false);
    assert.match(failing.message, /prisma generate/);

    // generate "succeeded" but wrote nothing: still not ready for the build.
    const empty = prismaPreflight(root, () => ({ status: 0 }));
    assert.equal(empty.ok, false);
    assert.match(empty.message, /src\/generated\/prisma\/client\.ts/);

    let ran = 0;
    const ok = prismaPreflight(root, () => {
      ran += 1;
      mkdirSync(join(root, 'src', 'generated', 'prisma'), { recursive: true });
      writeFileSync(join(root, 'src', 'generated', 'prisma', 'client.ts'), '// generated\n');
      return { status: 0 };
    });
    assert.equal(ran, 1);
    assert.equal(ok.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
