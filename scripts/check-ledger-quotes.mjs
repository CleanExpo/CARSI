#!/usr/bin/env node
/**
 * GP-719 — offline check of every VERIFIED ledger quote against what CI can actually read.
 *
 *   node scripts/check-ledger-quotes.mjs <ledger...> [--report] [--json]
 *        [--sources=DIR] [--baseline=FILE] [--require-source] [--today=YYYY-MM-DD]
 *
 * CI has no reliable network and must never hold IICRC / ANSI / Standards Australia text, so
 * this check does only what is decidable offline. For every VERIFIED row:
 *
 *   locator-invalid                 source_url is an http(s) URL with a host, or repo:<path>[#anchor]
 *   access-date-invalid             access_date is a real calendar date, not in the future, not pre-2000
 *   quote-empty                     the quote has text left after normalisation
 *   licensed-source-quote-too-long  a row citing a licensed-standards host carries at most a short
 *                                   attributed reference (LICENSED_MAX_QUOTE_WORDS words), never text
 *   licensed-source-not-flagged     ...and says so: needs_human_verification: true. Tooling can never
 *                                   check such a quote, so a person must, against the licensed copy
 *   source-text-unreadable          a repo: source or a committed snapshot that cannot be read (fails,
 *                                   never passes)
 *   quote-not-in-source             the quote is not word for word in the repo: file or the committed
 *                                   snapshot of an open source (ellipsis segments in order)
 *   no-offline-source               only with --require-source: an open-source row with no snapshot
 *
 * Snapshots live in --sources (default data/evidence-sources/). Its manifest.json is
 * {"sources":[{"url","file","retrieved":"YYYY-MM-DD","licence"}]}: the extracted text of an open
 * government / regulator document, committed by a person who has confirmed its licence. A manifest
 * entry on a licensed-standards host is a configuration error (exit 2): standards text never
 * enters the repo. scripts/check-ledger-quotes-live.mjs (opt-in, network) can produce the text.
 *
 * Rows with no repo: source and no snapshot are counted as "unchecked" and printed. They are not
 * passes: the count is the size of what this check could not see.
 *
 * Baseline (--baseline, default <sources>/quote-findings-baseline.json when present): findings on
 * main when the check landed, {"findings":[{"ledger":"<slug>","id","rule","reason"}]}. A baselined
 * finding is reported but does not fail; a baseline entry that no longer fires FAILS
 * (baseline-stale), so the list can only shrink.
 *
 * Exit: 0 pass, 1 a rule failed, 2 usage / unreadable ledger / bad manifest or baseline.
 * --report prints the same and exits 0 unless 2.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { hostOf, isLicensedHost, normalise, quoteInAny, wordCount, LICENSED_MAX_QUOTE_WORDS } from './ledger-quotes/match.mjs';

export const RULES = Object.freeze([
  'locator-invalid',
  'access-date-invalid',
  'quote-empty',
  'licensed-source-quote-too-long',
  'licensed-source-not-flagged',
  'source-text-unreadable',
  'quote-not-in-source',
  'no-offline-source',
  'baseline-stale',
]);

class ConfigError extends Error {}

const posix = (p) => p.split(path.sep).join('/');

function realDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

/** Repo root and slug for a ledger under data/courses/<slug>/; else cwd and the file name. */
function locate(ledger) {
  const p = posix(path.resolve(ledger));
  const m = p.match(/^(.*)\/data\/courses\/([^/]+)\//);
  return m ? { repoRoot: m[1], slug: m[2] } : { repoRoot: process.cwd(), slug: path.basename(ledger) };
}

export function loadSources(dir) {
  const file = path.join(dir, 'manifest.json');
  let m;
  try {
    m = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new ConfigError(`cannot read snapshot manifest ${file}: ${e.code ?? e.message}`);
  }
  if (!m || !Array.isArray(m.sources)) throw new ConfigError(`${file} must be {"sources":[...]}`);
  const byUrl = new Map();
  for (const s of m.sources) {
    if (!s || typeof s.url !== 'string' || typeof s.file !== 'string' || !realDate(s.retrieved) || typeof s.licence !== 'string' || !s.licence.trim()) {
      throw new ConfigError(`${file}: every source needs url, file, retrieved (YYYY-MM-DD) and licence: ${JSON.stringify(s)}`);
    }
    if (s.licence.trim().toUpperCase() === 'UNREVIEWED') throw new ConfigError(`${file}: ${s.url} has licence UNREVIEWED; a person confirms the licence before a snapshot is committed`);
    const host = hostOf(s.url);
    if (!host) throw new ConfigError(`${file}: snapshot url is not http(s): ${s.url}`);
    if (isLicensedHost(host)) throw new ConfigError(`${file}: ${s.url} is a licensed-standards host; its text must never be committed`);
    if (s.file.includes('..') || path.isAbsolute(s.file)) throw new ConfigError(`${file}: snapshot file must be a plain relative name: ${s.file}`);
    if (byUrl.has(s.url)) throw new ConfigError(`${file}: duplicate snapshot url ${s.url}`);
    byUrl.set(s.url, { ...s, path: path.join(dir, s.file) });
  }
  return byUrl;
}

export function loadBaseline(file) {
  let b;
  try {
    b = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new ConfigError(`cannot read baseline ${file}: ${e.code ?? e.message}`);
  }
  if (!b || !Array.isArray(b.findings) || b.findings.some((f) => !f || typeof f.ledger !== 'string' || typeof f.id !== 'string' || !RULES.includes(f.rule) || f.rule === 'baseline-stale' || typeof f.reason !== 'string' || !f.reason.trim())) {
    throw new ConfigError(`baseline ${file} must be {"findings":[{"ledger","id","rule","reason"}]} with registered rules`);
  }
  return b.findings;
}

/** Text of a repo:<path>[#anchor] source, as a list of strings the quote may sit in. */
function repoText(locator, repoRoot) {
  const m = locator.match(/^repo:([^#]+)(?:#(.*))?$/s);
  const rel = m[1];
  const anchor = m[2];
  const abs = path.resolve(repoRoot, rel);
  if (!posix(abs).startsWith(`${posix(path.resolve(repoRoot))}/`)) return { error: `repo path ${rel} leaves the repository` };
  let raw;
  try {
    raw = fs.readFileSync(abs, 'utf8');
  } catch (e) {
    return { error: `cannot read ${rel}: ${e.code ?? e.message}` };
  }
  if (!rel.endsWith('.json')) return { texts: [raw] };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: `${rel} is not valid JSON` };
  }
  let root = parsed;
  if (anchor) {
    const list = Array.isArray(parsed?.courses) ? parsed.courses : Array.isArray(parsed) ? parsed : null;
    root = list?.find((c) => c && (c.slug === anchor || c.id === anchor));
    if (!root) return { error: `anchor #${anchor} names no entry (slug or id) in ${rel}` };
  }
  const texts = [];
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') Object.values(o).forEach(walk);
    else if (typeof o === 'string') texts.push(o);
  };
  walk(root);
  return { texts };
}

/**
 * Check one ledger. Returns {ledger, slug, verified, matched, human, unchecked, findings:[{id,line,rule,message}]}.
 */
export function checkLedgerQuotes(ledger, { sources, today, requireSource = false }) {
  let text;
  try {
    text = fs.readFileSync(ledger, 'utf8');
  } catch (e) {
    throw new ConfigError(`cannot read ledger ${ledger}: ${e.code ?? e.message}`);
  }
  const { repoRoot, slug } = locate(ledger);
  const res = { ledger, slug, verified: 0, matched: 0, human: 0, unchecked: 0, findings: [] };
  const latest = new Date(today.getTime() + 24 * 3600 * 1000); // one day of time-zone slack
  text.split('\n').forEach((l, i) => {
    if (!l.trim()) return;
    let r;
    try {
      r = JSON.parse(l);
    } catch {
      return; // the schema check (check-evidence-ledger) owns bad JSON
    }
    if (!r || r.status !== 'VERIFIED') return;
    res.verified += 1;
    const id = typeof r.id === 'string' ? r.id : `line-${i + 1}`;
    const fail = (rule, message) => {
      if (!RULES.includes(rule)) throw new Error(`check-ledger-quotes: unregistered rule ${rule}`);
      res.findings.push({ id, line: i + 1, rule, message });
    };

    const url = typeof r.source_url === 'string' ? r.source_url : '';
    const isRepo = /^repo:[^#\s]+/.test(url);
    const host = hostOf(url);
    if (!isRepo && !host) fail('locator-invalid', `source_url "${url}" is neither an http(s) URL with a host nor repo:<path>`);

    const d = realDate(r.access_date);
    if (!d || d > latest || d < new Date('2000-01-01T00:00:00Z')) fail('access-date-invalid', `access_date "${r.access_date}" is not a real date between 2000-01-01 and today`);

    const quote = typeof r.quote === 'string' ? r.quote : '';
    if (normalise(quote) === '') {
      fail('quote-empty', 'VERIFIED row has no quote text');
      return;
    }

    if (isLicensedHost(host)) {
      if (wordCount(quote) > LICENSED_MAX_QUOTE_WORDS) {
        fail('licensed-source-quote-too-long', `quote is ${wordCount(quote)} words from licensed-standards host ${host}; at most ${LICENSED_MAX_QUOTE_WORDS} (a title or edition line) may be carried`);
      }
      if (r.needs_human_verification !== true) {
        fail('licensed-source-not-flagged', `source ${host} is a licensed-standards host: tooling cannot check this quote, so the row needs needs_human_verification: true`);
      }
      res.human += 1;
      return;
    }

    let got = null;
    if (isRepo) got = repoText(url, repoRoot);
    else if (sources.has(url)) {
      const s = sources.get(url);
      try {
        got = { texts: [fs.readFileSync(s.path, 'utf8')] };
      } catch (e) {
        got = { error: `snapshot ${s.file} for ${url}: ${e.code ?? e.message}` };
      }
    }
    if (!got) {
      if (requireSource) fail('no-offline-source', `no repo: source and no committed snapshot for ${url}`);
      res.unchecked += 1;
      return;
    }
    if (got.error) fail('source-text-unreadable', got.error);
    else if (!quoteInAny(quote, got.texts)) fail('quote-not-in-source', `quote "${quote}" is not word for word in ${isRepo ? url : `the snapshot of ${url}`}`);
    else res.matched += 1;
  });
  return res;
}

/** Split findings into failing and baselined; add baseline-stale for entries that no longer fire. */
export function applyBaseline(results, baseline) {
  const key = (slug, id, rule) => `${slug}\u0000${id}\u0000${rule}`;
  const wanted = new Map((baseline ?? []).map((b) => [key(b.ledger, b.id, b.rule), b]));
  const seen = new Set();
  for (const r of results) {
    r.failing = [];
    r.baselined = [];
    for (const f of r.findings) {
      const k = key(r.slug, f.id, f.rule);
      if (wanted.has(k)) {
        seen.add(k);
        r.baselined.push({ ...f, reason: wanted.get(k).reason });
      } else r.failing.push(f);
    }
  }
  const stale = [];
  const checkedSlugs = new Set(results.map((r) => r.slug));
  for (const [k, b] of wanted) {
    if (!seen.has(k) && checkedSlugs.has(b.ledger)) stale.push({ ...b, rule: 'baseline-stale', baselined_rule: b.rule, message: `baseline entry ${b.ledger} ${b.id} ${b.rule} no longer fires: remove it from the baseline` });
  }
  return stale;
}

function parseArgs(argv) {
  const o = { ledgers: [], report: false, json: false, sources: null, baseline: undefined, requireSource: false, today: null };
  for (const a of argv) {
    if (a === '--report') o.report = true;
    else if (a === '--json') o.json = true;
    else if (a === '--require-source') o.requireSource = true;
    else if (a.startsWith('--sources=')) o.sources = a.slice(10);
    else if (a.startsWith('--baseline=')) o.baseline = a.slice(11);
    else if (a.startsWith('--today=')) {
      o.today = realDate(a.slice(8));
      if (!o.today) throw new ConfigError(`--today needs YYYY-MM-DD, got ${a.slice(8)}`);
    } else if (a.startsWith('--')) throw new ConfigError(`unknown option ${a}`);
    else o.ledgers.push(a);
  }
  if (o.ledgers.length === 0) throw new ConfigError('usage: check-ledger-quotes.mjs <ledger...> [--report] [--json] [--sources=DIR] [--baseline=FILE] [--require-source] [--today=YYYY-MM-DD]');
  return o;
}

export function main(argv) {
  let o;
  let results;
  let stale;
  try {
    o = parseArgs(argv);
    const dir = o.sources ?? path.join(process.cwd(), 'data/evidence-sources');
    const sources = loadSources(dir);
    const defaultBaseline = path.join(dir, 'quote-findings-baseline.json');
    const baselineFile = o.baseline ?? (fs.existsSync(defaultBaseline) ? defaultBaseline : null);
    const baseline = baselineFile ? loadBaseline(baselineFile) : [];
    const today = o.today ?? new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    results = o.ledgers.map((l) => checkLedgerQuotes(l, { sources, today, requireSource: o.requireSource }));
    stale = applyBaseline(results, baseline);
  } catch (e) {
    if (!(e instanceof ConfigError)) throw e;
    console.error(`check-ledger-quotes: ${e.message}`);
    return 2;
  }
  const failed = stale.length > 0 || results.some((r) => r.failing.length > 0);
  const code = failed && !o.report ? 1 : 0;

  if (o.json) {
    console.log(JSON.stringify({ code, stale, ledgers: results.map(({ ledger, slug, verified, matched, human, unchecked, failing, baselined }) => ({ ledger, slug, verified, matched, human, unchecked, failing, baselined })) }, null, 2));
    return code;
  }
  const t = { verified: 0, matched: 0, human: 0, unchecked: 0, failing: 0, baselined: 0 };
  for (const r of results) {
    for (const f of r.failing) console.error(`${r.ledger}: ${f.id} (line ${f.line}) [${f.rule}] ${f.message}`);
    for (const f of r.baselined) console.log(`${r.ledger}: ${f.id} (line ${f.line}) [${f.rule}] BASELINED: ${f.reason}`);
    console.log(`${r.slug}: verified ${r.verified}, quote matched ${r.matched}, human-only ${r.human}, unchecked (no offline source) ${r.unchecked}, failing ${r.failing.length}, baselined ${r.baselined.length}`);
    for (const k of Object.keys(t)) t[k] += Array.isArray(r[k]) ? r[k].length : r[k];
  }
  for (const s of stale) console.error(`[baseline-stale] ${s.message}`);
  console.log(`check-ledger-quotes: ${results.length} ledger(s); VERIFIED ${t.verified}: matched ${t.matched}, human-only ${t.human}, unchecked ${t.unchecked}; failing ${t.failing + stale.length}, baselined ${t.baselined}`);
  console.log(failed ? `check-ledger-quotes: FAIL${o.report ? ' (report mode, exit 0)' : ''}` : 'check-ledger-quotes: pass');
  return code;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
