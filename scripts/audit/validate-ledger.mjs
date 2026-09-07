#!/usr/bin/env node
/**
 * GP-567 D2 — Evidence Ledger validator.
 *
 * The founder's rule as an executable schema. Every factual claim resolves to
 * EXACTLY ONE status:
 *
 *   VERIFIED  — primary source: source_url + access_date + quote of <= 25 words
 *   JUSTIFIED — 100% unavailable: confidence + reasoning + best_available_source
 *   GAP       — no defensible basis: reason + recommended_action
 *
 * There is no fourth state. CONFLICT is a SIDECAR field that may sit beside any
 * of the three; it never replaces one, because overwriting the original with a
 * disagreement destroys the very thing the ledger exists to preserve.
 *
 * Exit 0 = every entry conforms. Exit 1 = at least one violation, each named.
 * This script is the verification substrate for c2; check-mutants.mjs proves it
 * can fail.
 */
import fs from 'node:fs';

const STATUSES = ['VERIFIED', 'JUSTIFIED', 'GAP'];
const CONFIDENCES = ['high', 'medium', 'low'];
const MAX_QUOTE_WORDS = 25;
const REQUIRED_ALWAYS = ['id', 'claim', 'claim_class', 'surface', 'status', 'feeds'];

const wordCount = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const isIsoDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function validateEntry(e, lineNo) {
  const v = [];
  const at = (msg) => v.push(`line ${lineNo}: ${msg}`);

  if (typeof e !== 'object' || e === null || Array.isArray(e)) {
    at('entry is not a JSON object');
    return v;
  }

  for (const k of REQUIRED_ALWAYS) {
    if (e[k] === undefined || e[k] === null || e[k] === '') at(`missing required field "${k}"`);
  }

  // Exactly one status, from the closed set. Silence is a gap, not a pass.
  if (e.status !== undefined && !STATUSES.includes(e.status)) {
    at(`status "${e.status}" is not one of ${STATUSES.join(' | ')} — there is no fourth state`);
  }

  // CONFLICT must never be smuggled in as a status.
  if (e.status === 'CONFLICT') {
    at('CONFLICT is a sidecar field, never a status — record it beside the original entry');
  }

  if (e.status === 'VERIFIED') {
    if (!e.source_url) at('VERIFIED requires source_url');
    else if (!/^https?:\/\//.test(e.source_url) && !e.source_url.startsWith('repo:')) {
      at(`VERIFIED source_url "${e.source_url}" is neither a URL nor a repo: path`);
    }
    if (!isIsoDate(e.access_date)) at('VERIFIED requires access_date as YYYY-MM-DD');
    if (!e.quote) at('VERIFIED requires quote');
    else if (wordCount(e.quote) > MAX_QUOTE_WORDS) {
      at(`VERIFIED quote is ${wordCount(e.quote)} words, limit is ${MAX_QUOTE_WORDS}`);
    }
  }

  if (e.status === 'JUSTIFIED') {
    if (!e.confidence) at('JUSTIFIED requires confidence');
    else if (!CONFIDENCES.includes(e.confidence)) {
      at(`JUSTIFIED confidence "${e.confidence}" is not one of ${CONFIDENCES.join(' | ')}`);
    }
    if (!e.reasoning) at('JUSTIFIED requires reasoning — the justification IS the product');
    if (!e.best_available_source) at('JUSTIFIED requires best_available_source');
  }

  if (e.status === 'GAP') {
    if (!e.reason) at('GAP requires reason');
    if (!e.recommended_action) at('GAP requires recommended_action (rewrite | remove | substantiate)');
  }

  // Sidecar shape, when present.
  if (e.conflict !== undefined) {
    const c = e.conflict;
    if (typeof c !== 'object' || c === null || Array.isArray(c)) at('conflict must be an object sidecar');
    else {
      if (!c.engine_a || !c.engine_b) at('conflict requires engine_a and engine_b');
      if (!c.disagreement) at('conflict requires disagreement');
      if (c.overwrote_original) at('conflict must never overwrite the original claim');
    }
  }

  if (e.feeds !== undefined && !Array.isArray(e.feeds)) at('feeds must be an array of course slugs or surfaces');
  if (e.check_by !== undefined && !isIsoDate(e.check_by)) at('check_by must be YYYY-MM-DD');

  return v;
}

export function validateFile(file) {
  if (!fs.existsSync(file)) return { ok: false, violations: [`missing ledger file: ${file}`], count: 0 };
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const violations = [];
  const ids = new Map();
  let count = 0;
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    count += 1;
    const lineNo = i + 1;
    let e;
    try {
      e = JSON.parse(t);
    } catch (err) {
      violations.push(`line ${lineNo}: invalid JSON — ${err.message}`);
      return;
    }
    violations.push(...validateEntry(e, lineNo));
    if (e && e.id) {
      if (ids.has(e.id)) violations.push(`line ${lineNo}: duplicate id "${e.id}" (first seen line ${ids.get(e.id)})`);
      else ids.set(e.id, lineNo);
    }
  });
  if (count === 0) violations.push(`${file} holds no entries — an empty ledger is not a clean ledger`);
  return { ok: violations.length === 0, violations, count };
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('validate-ledger.mjs');
if (invokedDirectly) {
  const file = process.argv[2] || 'docs/audit/evidence-ledger.jsonl';
  const r = validateFile(file);
  if (r.ok) {
    console.log(`OK ${file}: ${r.count} entries, 0 violations`);
    process.exit(0);
  }
  console.error(`FAIL ${file}: ${r.violations.length} violation(s) across ${r.count} entries`);
  for (const v of r.violations) console.error(`  - ${v}`);
  process.exit(1);
}
