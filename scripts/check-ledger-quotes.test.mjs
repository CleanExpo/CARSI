#!/usr/bin/env node
/**
 * GP-719 tests for scripts/check-ledger-quotes.mjs (offline, CI) and
 * scripts/check-ledger-quotes-live.mjs (opt-in, network).
 *
 *   node --test scripts/check-ledger-quotes.test.mjs
 *
 * Every rule has a planted bad row that must fail naming the rule, beside a negative control
 * (the same row, correct) that must pass. Then each rule is removed alone from a scratch copy
 * of the script (a source mutant) and its own case must turn red while the clean case stays
 * green, so no case passes by accident. One-word mutants of real ledger quotes (repo: sources
 * on main) must fail; the unmutated rows must pass.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalise, quoteInText, splitQuote, isLicensedUrl } from './ledger-quotes/match.mjs';
import { RULES } from './check-ledger-quotes.mjs';
import { htmlToText } from './check-ledger-quotes-live.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const REAL_BIN = path.join(HERE, 'check-ledger-quotes.mjs');
// LEDGER_QUOTES_BIN=<stub> runs the cases against another binary, to show the suite red from outside.
const BIN = process.env.LEDGER_QUOTES_BIN ?? REAL_BIN;
const LIVE = path.join(HERE, 'check-ledger-quotes-live.mjs');
const TODAY = '--today=2026-11-21';

const SNAP_URL = 'https://www.example.gov.au/guide';
const SNAP_TEXT = 'Intro.\nWorkers must  wear a P2 respirator when cutting.\nKeep the room at 18˚C or warmer. Later text.';
const REPO_TEXT = 'Clear the space of people and pets before you start, and keep it clear.';

const row = (extra = {}) => ({
  id: 'Q-001', claim: 'c', claim_class: 'ppe', surface: 'course:demo', status: 'VERIFIED', feeds: ['course:demo'],
  source_url: SNAP_URL, access_date: '2026-11-02', quote: 'Workers must wear a P2 respirator when cutting.', ...extra,
});
const repoRow = (extra = {}) => row({ id: 'Q-002', source_url: 'repo:data/seed/demo.json#demo', quote: 'and keep it clear.', ...extra });
const stdRow = (extra = {}) => row({ id: 'Q-003', source_url: 'https://store.standards.org.au/reader/as-nzs-0000', quote: 'AS/NZS 0000:2020 Example standard', needs_human_verification: true, ...extra });
const openRow = (extra = {}) => row({ id: 'Q-004', source_url: 'https://www.example.govt.nz/not-snapshotted', quote: 'anything at all', ...extra });
const CLEAN = () => [row(), repoRow(), stdRow(), openRow()];

function fixture({ rows = CLEAN(), manifest, baseline, snapshot = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gp719-'));
  const ev = path.join(root, 'data/courses/demo/v1-draft/evidence');
  const src = path.join(root, 'sources');
  fs.mkdirSync(ev, { recursive: true });
  fs.mkdirSync(src);
  fs.mkdirSync(path.join(root, 'data/seed'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/seed/demo.json'), JSON.stringify({ courses: [{ slug: 'other', body: 'and keep it closed.' }, { slug: 'demo', lessons: [{ body: `<p>${REPO_TEXT}</p>` }] }] }));
  if (snapshot) fs.writeFileSync(path.join(src, 'guide.txt'), SNAP_TEXT);
  fs.writeFileSync(path.join(src, 'manifest.json'), JSON.stringify(manifest ?? { sources: [{ url: SNAP_URL, file: 'guide.txt', retrieved: '2026-11-02', licence: 'CC BY 4.0' }] }));
  if (baseline) fs.writeFileSync(path.join(src, 'quote-findings-baseline.json'), JSON.stringify(baseline));
  const ledger = path.join(ev, 'evidence-ledger.jsonl');
  fs.writeFileSync(ledger, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return { root, ledger, args: [ledger, `--sources=${src}`, TODAY] };
}

function run(bin, args) {
  const r = spawnSync('node', [bin, ...args], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** One planted case per rule, each with its negative control (`good`). */
const CASES = [
  { rule: 'locator-invalid', bad: () => [row({ source_url: 'www.example.gov.au/guide' })], good: () => [row()] },
  { rule: 'access-date-invalid', bad: () => [row({ access_date: '2026-02-30' })], good: () => [row({ access_date: '2026-02-28' })] },
  { rule: 'access-date-invalid', name: 'future access_date', bad: () => [row({ access_date: '2027-01-01' })], good: () => [row({ access_date: '2026-11-21' })] },
  { rule: 'quote-empty', bad: () => [row({ quote: '   ' })], good: () => [row()] },
  { rule: 'licensed-source-quote-too-long', bad: () => [stdRow({ quote: 'The Standard outlines procedures for the classification, segregation, packaging and containment of healthcare waste.' })], good: () => [stdRow()] },
  { rule: 'licensed-source-not-flagged', bad: () => [stdRow({ needs_human_verification: undefined })], good: () => [stdRow()] },
  { rule: 'licensed-source-not-flagged', name: 'IICRC host is licensed too', bad: () => [stdRow({ source_url: 'https://iicrc.org/faq/', needs_human_verification: 'yes' })], good: () => [stdRow({ source_url: 'https://iicrc.org/faq/' })] },
  { rule: 'source-text-unreadable', bad: () => [repoRow({ source_url: 'repo:data/seed/missing.json' })], good: () => [repoRow()] },
  { rule: 'source-text-unreadable', name: 'repo anchor that names no entry', bad: () => [repoRow({ source_url: 'repo:data/seed/demo.json#nope' })], good: () => [repoRow()] },
  { rule: 'source-text-unreadable', name: 'repo path leaving the repo', bad: () => [repoRow({ source_url: 'repo:../../etc/hostname' })], good: () => [repoRow()] },
  { rule: 'source-text-unreadable', name: 'snapshot file missing', bad: () => [row()], good: () => [row()], fx: { snapshot: false }, goodFx: {} },
  { rule: 'quote-not-in-source', name: 'one-word mutant against a snapshot', bad: () => [row({ quote: 'Workers must wear a P1 respirator when cutting.' })], good: () => [row()] },
  { rule: 'quote-not-in-source', name: 'one-word mutant against a repo: source', bad: () => [repoRow({ quote: 'and keep it closed.' })], good: () => [repoRow()] },
  { rule: 'quote-not-in-source', name: 'ellipsis segments out of order', bad: () => [row({ quote: 'when cutting. … Workers must wear' })], good: () => [row({ quote: 'Workers must … when cutting.' })] },
  { rule: 'quote-not-in-source', name: 'case is not folded', bad: () => [row({ quote: 'workers must wear a P2 respirator' })], good: () => [row({ quote: 'Workers must wear a P2 respirator' })] },
  { rule: 'no-offline-source', bad: () => [openRow()], good: () => [openRow()], args: ['--require-source'], goodArgs: [] },
];

const runCase = (bin, c, which) => {
  const fx = fixture({ rows: which === 'bad' ? c.bad() : c.good(), ...((which === 'bad' ? c.fx : c.goodFx ?? c.fx) ?? {}) });
  try {
    const extra = which === 'bad' ? c.args ?? [] : c.goodArgs ?? c.args ?? [];
    return run(bin, [...fx.args, ...extra]);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
};
const fires = (r, rule) => r.code === 1 && r.out.includes(`[${rule}]`);

describe('matcher', () => {
  it('normalises only whitespace, NBSP, curly quotes and the degree sign', () => {
    assert.equal(normalise('a  \n b ‘x’ “y” 18˚C 18ºC'), "a b 'x' \"y\" 18°C 18°C");
    assert.ok(quoteInText('maintain the main living room to 18°C', 'can heat and maintain the main living room to 18˚C'));
    assert.ok(quoteInText("You can't tell", 'You can’t tell if'));
    assert.equal(quoteInText('a-b', 'a–b'), false, 'dashes are not folded');
    assert.equal(quoteInText('Abc', 'abc'), false, 'case is not folded');
  });
  it('ellipsis segments must appear in order; " | " passages in any order', () => {
    assert.deepEqual(splitQuote('one ... two … three | four'), [['one', 'two', 'three'], ['four']]);
    assert.ok(quoteInText('one … three', 'one two three'));
    assert.equal(quoteInText('three … one', 'one two three'), false);
    assert.ok(quoteInText('three | one', 'one two three'));
    assert.equal(quoteInText('three | zero', 'one two three'), false);
    assert.equal(quoteInText(' … ', 'anything'), false, 'a quote of only an ellipsis matches nothing');
  });
  it('the second similar sentence does not stand in for the quoted one', () => {
    const src = 'The PCBU has a primary duty of care to ensure the health of workers. It has a primary duty of care to ensure the health and safety of workers.';
    assert.ok(quoteInText('primary duty of care to ensure the health and safety of workers', src));
    assert.equal(quoteInText('primary duty of care to ensure the safety of workers', src), false);
  });
  it('licensed-standards hosts include subdomains and nothing near-miss', () => {
    for (const u of ['https://iicrc.org/x', 'https://www.iicrc.org/x', 'https://iicrc.gilmoreglobal.com/', 'https://webstore.ansi.org/s', 'https://store.standards.org.au/r', 'https://www.standards.govt.nz/d']) assert.ok(isLicensedUrl(u), u);
    for (const u of ['https://www.safeworkaustralia.gov.au/', 'https://notiicrc.org/', 'https://iicrc.org.evil.example/', 'repo:x']) assert.equal(isLicensedUrl(u), false, u);
  });
});

describe('each rule fails on its planted row and passes on its control', () => {
  it('the clean fixture passes, and counts what it could not see', () => {
    const fx = fixture();
    const r = run(BIN, fx.args);
    fs.rmSync(fx.root, { recursive: true, force: true });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /VERIFIED 4: matched 2, human-only 1, unchecked 1; failing 0/);
  });
  for (const c of CASES) {
    it(`${c.rule}${c.name ? ` (${c.name})` : ''}`, () => {
      const bad = runCase(BIN, c, 'bad');
      assert.ok(fires(bad, c.rule), `planted row should fail naming ${c.rule}, got exit ${bad.code}:\n${bad.out}`);
      const good = runCase(BIN, c, 'good');
      assert.equal(good.code, 0, `control should pass, got:\n${good.out}`);
    });
  }
  it('every registered rule has a planted case', () => {
    const covered = new Set([...CASES.map((c) => c.rule), 'baseline-stale']);
    assert.deepEqual([...RULES].sort(), [...covered].sort());
  });
});

describe('baseline, report mode and configuration', () => {
  const finding = { ledger: 'demo', id: 'Q-003', rule: 'licensed-source-not-flagged', reason: 'known on main' };
  it('a baselined finding is reported and does not fail', () => {
    const fx = fixture({ rows: [stdRow({ needs_human_verification: undefined })], baseline: { findings: [finding] } });
    const r = run(BIN, fx.args);
    fs.rmSync(fx.root, { recursive: true, force: true });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /BASELINED: known on main/);
  });
  it('a baseline entry that no longer fires fails as baseline-stale', () => {
    const fx = fixture({ rows: [stdRow()], baseline: { findings: [finding] } });
    const r = run(BIN, fx.args);
    fs.rmSync(fx.root, { recursive: true, force: true });
    assert.ok(fires(r, 'baseline-stale'), r.out);
  });
  it('a baseline only covers the rule it names', () => {
    const fx = fixture({ rows: [stdRow({ needs_human_verification: undefined, quote: 'one two three four five six seven eight nine ten eleven twelve thirteen' })], baseline: { findings: [finding] } });
    const r = run(BIN, fx.args);
    fs.rmSync(fx.root, { recursive: true, force: true });
    assert.ok(fires(r, 'licensed-source-quote-too-long'), r.out);
  });
  it('--report exits 0 on a failing row and still names it', () => {
    const fx = fixture({ rows: [row({ quote: 'Workers must wear a P1 respirator' })] });
    const r = run(BIN, [...fx.args, '--report']);
    fs.rmSync(fx.root, { recursive: true, force: true });
    assert.equal(r.code, 0);
    assert.match(r.out, /\[quote-not-in-source\]/);
  });
  for (const [name, manifest] of [
    ['a snapshot of a licensed-standards host', { sources: [{ url: 'https://store.standards.org.au/x', file: 'guide.txt', retrieved: '2026-11-02', licence: 'x' }] }],
    ['an UNREVIEWED licence', { sources: [{ url: SNAP_URL, file: 'guide.txt', retrieved: '2026-11-02', licence: 'UNREVIEWED' }] }],
    ['a snapshot entry with no licence', { sources: [{ url: SNAP_URL, file: 'guide.txt', retrieved: '2026-11-02' }] }],
    ['a snapshot file that climbs out of the sources dir', { sources: [{ url: SNAP_URL, file: '../guide.txt', retrieved: '2026-11-02', licence: 'x' }] }],
    ['a manifest that is not {"sources":[]}', { snapshots: [] }],
  ]) {
    it(`exit 2 for ${name}`, () => {
      const fx = fixture({ manifest });
      const r = run(BIN, fx.args);
      fs.rmSync(fx.root, { recursive: true, force: true });
      assert.equal(r.code, 2, r.out);
    });
  }
  it('exit 2 for a missing manifest, a missing ledger and an unknown option', () => {
    const fx = fixture();
    fs.rmSync(path.join(fx.root, 'sources/manifest.json'));
    assert.equal(run(BIN, fx.args).code, 2);
    fs.rmSync(fx.root, { recursive: true, force: true });
    assert.equal(run(BIN, ['/nonexistent/ledger.jsonl', `--sources=${path.join(REPO, 'data/evidence-sources')}`]).code, 2);
    assert.equal(run(BIN, ['x.jsonl', '--nope']).code, 2);
  });
});

describe('source mutants: removing one rule turns only its own case red', () => {
  const src = fs.readFileSync(REAL_BIN, 'utf8');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'gp719-mut-'));
  fs.mkdirSync(path.join(scratch, 'ledger-quotes'));
  fs.copyFileSync(path.join(HERE, 'ledger-quotes/match.mjs'), path.join(scratch, 'ledger-quotes/match.mjs'));
  const seen = new Set();
  for (const c of CASES) {
    if (seen.has(c.rule)) continue;
    seen.add(c.rule);
    it(`without ${c.rule}`, () => {
      const needle = `fail('${c.rule}',`;
      assert.ok(src.includes(needle), `rule ${c.rule} must be emitted from a fail('${c.rule}', ...) site`);
      const bin = path.join(scratch, `mut-${c.rule}.mjs`);
      fs.writeFileSync(bin, src.split(needle).join(`((..._) => {})('${c.rule}',`));
      assert.equal(fires(runCase(bin, c, 'bad'), c.rule), false, 'mutant still fires the rule: the case is not what proves it');
      const fx = fixture();
      assert.equal(run(bin, fx.args).code, 0, 'clean fixture should still pass on the mutant');
      fs.rmSync(fx.root, { recursive: true, force: true });
    });
  }
  it('without baseline-stale', () => {
    const bin = path.join(scratch, 'mut-stale.mjs');
    fs.writeFileSync(bin, src.replace('if (!seen.has(k) && checkedSlugs.has(b.ledger)) stale.push(', 'if (false) stale.push('));
    const fx = fixture({ rows: [stdRow()], baseline: { findings: [{ ledger: 'demo', id: 'Q-003', rule: 'licensed-source-not-flagged', reason: 'r' }] } });
    const r = run(bin, fx.args);
    fs.rmSync(fx.root, { recursive: true, force: true });
    assert.equal(r.code, 0, 'the stale-baseline case must be what proves the rule');
  });
});

describe('real ledgers on main', () => {
  const real = path.join(REPO, 'data/courses/fire-smoke-damage-restoration-fundamentals/v1-draft/evidence/evidence-ledger.jsonl');
  const repoRows = fs.readFileSync(real, 'utf8').split('\n').filter((l) => l.includes('"source_url":"repo:')).map((l) => JSON.parse(l));
  const inRepoTree = (rows) => {
    // a scratch ledger inside this checkout, so repo: paths resolve against the real seed data
    const dir = fs.mkdtempSync(path.join(REPO, 'data/courses/.gp719-test-'));
    const f = path.join(dir, 'evidence-ledger.jsonl');
    fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    return { dir, f };
  };
  it('has repo: rows to test (the test is not vacuous)', () => assert.ok(repoRows.length >= 2));
  it('the real repo: rows pass and every one-word mutant of them fails', () => {
    const ok = inRepoTree(repoRows);
    try {
      const r = run(BIN, [ok.f, `--sources=${path.join(REPO, 'data/evidence-sources')}`]);
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, new RegExp(`matched ${repoRows.length}`));
    } finally {
      fs.rmSync(ok.dir, { recursive: true, force: true });
    }
    for (const base of repoRows) {
      const words = base.quote.split(' ');
      for (let i = 0; i < words.length; i += 1) {
        const mutant = { ...base, quote: words.map((w, j) => (j === i ? `${w}x` : w)).join(' ') };
        const m = inRepoTree([mutant]);
        try {
          const r = run(BIN, [m.f, `--sources=${path.join(REPO, 'data/evidence-sources')}`]);
          assert.ok(fires(r, 'quote-not-in-source'), `mutant "${mutant.quote}" should fail:\n${r.out}`);
        } finally {
          fs.rmSync(m.dir, { recursive: true, force: true });
        }
      }
    }
  });
  it('npm run check:ledger-quotes passes on main with the committed baseline', () => {
    const ledgers = fs.readdirSync(path.join(REPO, 'data/courses')).flatMap((s) => ['v1-draft/evidence', 'evidence'].map((d) => path.join(REPO, 'data/courses', s, d, 'evidence-ledger.jsonl'))).filter((f) => fs.existsSync(f));
    assert.ok(ledgers.length >= 2, 'found the ledgers on main');
    const r = spawnSync('node', [BIN, ...ledgers], { encoding: 'utf8', cwd: REPO });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const n = JSON.parse(fs.readFileSync(path.join(REPO, 'data/evidence-sources/quote-findings-baseline.json'), 'utf8')).findings.length;
    assert.match(r.stdout, new RegExp(`failing 0, baselined ${n}\\b`));
  });
});

describe('opt-in live checker', () => {
  it('htmlToText drops markup and decodes entities', () => {
    assert.equal(normalise(htmlToText('<p>18&deg;C &amp; <b>can&rsquo;t</b></p><script>x()</script>&#x2014;&#8217;')), "18°C & can't —'");
  });
  const serve = (body) => new Promise((resolve) => {
    const s = http.createServer((_, res) => { res.setHeader('content-type', 'text/html'); res.end(body); });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
  const runLive = (args) => new Promise((resolve) => {
    const p = spawn('node', [LIVE, ...args], { env: { ...process.env, NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' } });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => resolve({ code, out }));
  });
  it('MATCHED on the real quote, MISSING on a one-word mutant, UNKNOWN on a dead host, HUMAN on a standards host', async () => {
    const s = await serve('<html><body><p>Workers must&nbsp;wear a <em>P2</em> respirator when cutting.</p></body></html>');
    const url = `http://127.0.0.1:${s.address().port}/guide`;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gp719-live-'));
    const f = path.join(dir, 'l.jsonl');
    const write = (rows) => fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    try {
      write([row({ source_url: url })]);
      let r = await runLive([f, `--cache-dir=${path.join(dir, 'c1')}`]);
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /MATCHED 1, MISSING 0, UNKNOWN 0/);
      write([row({ source_url: url, quote: 'Workers must wear a P1 respirator when cutting.' })]);
      r = await runLive([f, `--cache-dir=${path.join(dir, 'c2')}`]);
      assert.equal(r.code, 1);
      assert.match(r.out, /MISSING Q-001/);
      write([row({ source_url: 'http://127.0.0.1:9/gone' })]);
      r = await runLive([f, `--cache-dir=${path.join(dir, 'c3')}`, '--timeout=5']);
      assert.equal(r.code, 1);
      assert.match(r.out, /UNKNOWN Q-001/);
      write([stdRow()]);
      r = await runLive([f, `--cache-dir=${path.join(dir, 'c4')}`]);
      assert.equal(r.code, 0);
      assert.match(r.out, /HUMAN 1/);
      assert.deepEqual(fs.readdirSync(path.join(dir, 'c4')), [], 'a standards host is never fetched');
    } finally {
      s.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
