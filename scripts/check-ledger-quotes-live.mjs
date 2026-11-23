#!/usr/bin/env node
/**
 * GP-719 — OPT-IN live check of VERIFIED ledger quotes against the live source. NOT in the
 * required CI path: it needs network, and a flaky regulator site must not block every PR.
 * Run it by hand or on a schedule (`npm run check:ledger-quotes:live -- <ledger...>`).
 *
 *   node scripts/check-ledger-quotes-live.mjs <ledger...> [--ids=A,B] [--json]
 *        [--cache-dir=DIR] [--snapshot-dir=DIR] [--timeout=SECONDS]
 *
 * For every VERIFIED row with an http(s) source_url:
 *   - fetches it with curl (which honours the HTTPS proxy), using pdftotext for PDFs;
 *   - normalises only whitespace, non-breaking spaces, curly quotes and the degree sign
 *     (scripts/ledger-quotes/match.mjs, the same matcher the offline check uses);
 *   - requires the quote as a substring, ellipsis segments in order;
 *   - a failed fetch or extraction is UNKNOWN, which fails, never passes;
 *   - NEVER fetches a licensed-standards host (IICRC, ANSI, Standards Australia / NZ, ...):
 *     those rows are HUMAN and are reported, not fetched.
 * Rows with a repo: source are left to the offline check.
 *
 * --snapshot-dir writes the extracted text of each open source it fetched, plus a manifest
 * fragment with licence "UNREVIEWED". The offline check refuses an UNREVIEWED licence, so a
 * person must confirm each source's licence before a snapshot is committed under
 * data/evidence-sources/.
 *
 * Exit: 0 every fetched quote MATCHED, 1 any MISSING or UNKNOWN, 2 usage.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { hostOf, isLicensedHost, quoteInText } from './ledger-quotes/match.mjs';

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', deg: '°', ordm: 'º', middot: '·', copy: '©', reg: '®', trade: '™', sup2: '²', sup3: '³', micro: 'µ', times: '×', frac12: '½' };

export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
      if (e[0] === '#') {
        const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
      }
      return NAMED[e.toLowerCase()] ?? m;
    });
}

function fetchText(url, cacheDir, timeout) {
  const key = crypto.createHash('sha256').update(url).digest('hex').slice(0, 24);
  const body = path.join(cacheDir, `${key}.body`);
  const txt = path.join(cacheDir, `${key}.txt`);
  if (fs.existsSync(txt)) return { text: fs.readFileSync(txt, 'utf8') };
  const c = spawnSync('curl', ['-sS', '-L', '--fail', '--max-time', String(timeout), '-A', 'Mozilla/5.0 (ledger-quote-check)', '-o', body, '-w', '%{content_type}', url], { encoding: 'utf8' });
  if (c.status !== 0) return { error: `fetch failed: ${(c.stderr || `curl exit ${c.status}`).trim().split('\n').pop()}` };
  const type = String(c.stdout || '').toLowerCase();
  const head = fs.readFileSync(body).subarray(0, 5).toString('latin1');
  let text;
  if (type.includes('pdf') || head === '%PDF-') {
    const p = spawnSync('pdftotext', ['-enc', 'UTF-8', body, '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    if (p.status !== 0) return { error: `pdftotext failed: ${(p.stderr || `exit ${p.status}`).trim()}` };
    text = p.stdout;
  } else text = htmlToText(fs.readFileSync(body, 'utf8'));
  if (!text.trim()) return { error: 'source extracted to no text' };
  fs.writeFileSync(txt, text);
  return { text };
}

function parseArgs(argv) {
  const o = { ledgers: [], ids: null, json: false, cacheDir: null, snapshotDir: null, timeout: 30 };
  for (const a of argv) {
    if (a === '--json') o.json = true;
    else if (a.startsWith('--ids=')) o.ids = new Set(a.slice(6).split(',').filter(Boolean));
    else if (a.startsWith('--cache-dir=')) o.cacheDir = a.slice(12);
    else if (a.startsWith('--snapshot-dir=')) o.snapshotDir = a.slice(15);
    else if (a.startsWith('--timeout=') && /^\d+$/.test(a.slice(10))) o.timeout = Number(a.slice(10));
    else if (a.startsWith('--')) return null;
    else o.ledgers.push(a);
  }
  return o.ledgers.length ? o : null;
}

export function main(argv) {
  const o = parseArgs(argv);
  if (!o) {
    console.error('usage: check-ledger-quotes-live.mjs <ledger...> [--ids=A,B] [--json] [--cache-dir=DIR] [--snapshot-dir=DIR] [--timeout=SECONDS]');
    return 2;
  }
  const cacheDir = o.cacheDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-quotes-'));
  fs.mkdirSync(cacheDir, { recursive: true });
  const out = [];
  const fetched = new Map();
  for (const ledger of o.ledgers) {
    let lines;
    try {
      lines = fs.readFileSync(ledger, 'utf8').split('\n');
    } catch (e) {
      console.error(`cannot read ledger ${ledger}: ${e.code ?? e.message}`);
      return 2;
    }
    lines.forEach((l, i) => {
      if (!l.trim()) return;
      let r;
      try {
        r = JSON.parse(l);
      } catch {
        return;
      }
      if (!r || r.status !== 'VERIFIED' || (o.ids && !o.ids.has(r.id))) return;
      const host = hostOf(r.source_url);
      const row = { ledger, id: r.id, line: i + 1, url: r.source_url };
      if (!host) return; // repo: sources are the offline check's
      if (isLicensedHost(host)) return out.push({ ...row, verdict: 'HUMAN', detail: `licensed-standards host ${host}: never fetched` });
      if (!fetched.has(r.source_url)) fetched.set(r.source_url, fetchText(r.source_url, cacheDir, o.timeout));
      const got = fetched.get(r.source_url);
      if (got.error) return out.push({ ...row, verdict: 'UNKNOWN', detail: got.error });
      out.push({ ...row, verdict: quoteInText(r.quote ?? '', got.text) ? 'MATCHED' : 'MISSING', detail: r.quote });
    });
  }
  if (o.snapshotDir) {
    fs.mkdirSync(o.snapshotDir, { recursive: true });
    const sources = [];
    for (const [url, got] of fetched) {
      if (got.error) continue;
      const file = `${crypto.createHash('sha256').update(url).digest('hex').slice(0, 24)}.txt`;
      fs.writeFileSync(path.join(o.snapshotDir, file), got.text);
      sources.push({ url, file, retrieved: new Date().toISOString().slice(0, 10), licence: 'UNREVIEWED' });
    }
    fs.writeFileSync(path.join(o.snapshotDir, 'manifest.fragment.json'), JSON.stringify({ sources }, null, 2) + '\n');
  }
  const count = (v) => out.filter((x) => x.verdict === v).length;
  if (o.json) console.log(JSON.stringify({ rows: out }, null, 2));
  else {
    for (const x of out) if (x.verdict !== 'MATCHED') console.log(`${x.verdict} ${x.id} (${x.ledger}:${x.line}) ${x.url} — ${x.detail}`);
    console.log(`check-ledger-quotes-live: MATCHED ${count('MATCHED')}, MISSING ${count('MISSING')}, UNKNOWN ${count('UNKNOWN')}, HUMAN ${count('HUMAN')}`);
  }
  return count('MISSING') + count('UNKNOWN') > 0 ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
