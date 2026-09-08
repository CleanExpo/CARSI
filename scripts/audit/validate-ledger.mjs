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
 *
 * ── Why every violation carries a RULE ID ──────────────────────────────────
 *
 * Round-3 review defeated the previous coverage design twice, by execution not
 * by argument:
 *
 *   (a) It DELETED the real "quote over 25 words" mutant and the suite still
 *       printed OK, because coverage was derived from four exported field lists
 *       and the quote / ISO-date / sidecar / feeds rules are not reachable from
 *       any of them. Those rules were uncovered BY CONSTRUCTION.
 *   (b) It kept a mutant NAMED "missing status" while planting a dropped `id`,
 *       and the suite still printed OK, because coverage matched mutant *name
 *       strings* with a regex. The name was doing the work, not the mutant.
 *
 * Both holes have the same root: coverage was inferred from NAMES. So the
 * validator now emits a machine-checkable rule id beside every message, and
 * `RULES` below is the complete registry. `check-mutants.mjs` derives its
 * obligation from that registry and verifies it against what the validator
 * ACTUALLY emitted for each mutant. A rule with no mutant fails the suite; a
 * mutant that does not trigger the rule it claims fails the suite. Neither can
 * be satisfied by naming.
 *
 * Every violation, entry-level or file-level, is emitted through one `emit()`
 * choke point that throws on an unregistered id, so adding a rule without
 * registering it is a hard error rather than a silent coverage hole. And because
 * a choke point is only a convention until something enforces it, both exported
 * validators pass their result through `sealViolations` on the way out — see the
 * SEAL note below for why that claim is about the data and not the source.
 */
import fs from 'node:fs';

export const STATUSES = ['VERIFIED', 'JUSTIFIED', 'GAP'];
export const CONFIDENCES = ['high', 'medium', 'low'];
const MAX_QUOTE_WORDS = 25;
export const REQUIRED_ALWAYS = ['id', 'claim', 'claim_class', 'surface', 'status', 'feeds'];

// The GAP action vocabulary is CLOSED and enforced.
//
// It was previously named in the error message only — "GAP requires
// recommended_action (rewrite | remove | substantiate)" — while the code merely
// checked the field was non-empty. Independent review planted
// `recommended_action: "launder"` and it validated clean. A message that
// documents a closed set the code does not enforce is worse than no message: it
// tells the reader a check exists that does not.
export const GAP_ACTIONS = ['rewrite', 'remove', 'substantiate'];

// The complete registry of entry-level rules. One id per distinct way an entry
// can violate the schema. `missing required field` is registered PER FIELD, so
// adding a field to REQUIRED_ALWAYS adds a rule that needs its own mutant.
export const ENTRY_RULES = Object.freeze([
  'entry-not-object',
  ...REQUIRED_ALWAYS.map((f) => `missing-required:${f}`),
  'status-not-in-set',
  'conflict-as-status',
  'verified-no-source-url',
  'verified-source-url-shape',
  'verified-no-access-date',
  'verified-no-quote',
  'verified-quote-too-long',
  'justified-no-confidence',
  'justified-confidence-not-in-set',
  'justified-no-reasoning',
  'justified-no-best-source',
  'gap-no-reason',
  'gap-no-action',
  'gap-action-not-in-set',
  'conflict-not-object',
  'conflict-no-engines',
  'conflict-no-disagreement',
  'conflict-overwrote-original',
  'feeds-not-array',
  'check-by-not-iso',
]);

// File-level rules. `validateFile` can fail in ways no single entry can, and
// round 3 showed that an uncovered rule set is exactly what hides behind a
// green suite — so these are registered and covered too.
export const FILE_RULES = Object.freeze([
  'file-missing',
  'file-invalid-json',
  'file-duplicate-id',
  'file-empty',
]);

export const RULES = Object.freeze([...ENTRY_RULES, ...FILE_RULES]);

const wordCount = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const isIsoDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * The ONE place a rule id becomes a violation.
 *
 * Round-5 (gemini lane): the entry rules went through `at()`, which refuses an
 * unregistered id, but the file rules pushed their objects by hand. So the
 * registered-id guard covered half the validator, and `check-mutants.mjs`, which
 * proves coverage by reading `at()` call sites, could not see the other half at
 * all — a file rule could be added, fire in anger, and never be demanded by a
 * mutant. Two ways to emit a rule meant one of them was unguarded; there is now
 * one, and every caller is a call site the scan can find.
 */
const emit = (list, registry, registryName, rule, message) => {
  if (!registry.includes(rule)) {
    throw new Error(`validate-ledger: unregistered rule id "${rule}" — add it to ${registryName} so it gets a mutant`);
  }
  list.push({ rule, message });
};

/**
 * The SEAL — every violation leaving this module carries a registered rule id.
 *
 * Round-6 broke the previous guarantee, which was a static scan of this file's
 * source counting `.push({ rule` shapes. It was defeated twice in one round: a
 * computed key `{ ['rule']: … }` matched no shape the scan knew, and a pair of
 * string literals holding a comment-open and a comment-close made the scan's own stripping
 * erase a raw push before it was ever read. Neither is a bug in the regex.
 * Deciding "does this source construct an object with a rule property" is not
 * decidable by pattern, and an AST would fall to `obj['ru' + 'le']` next.
 *
 * So the claim moved from the source to the DATA, where it is decidable. It no
 * longer matters how a violation was built or which door it came through: if it
 * leaves this module, its id is registered, or nothing leaves at all. A door
 * emitting a registered id is already covered by that id's mutant; a door
 * emitting an unregistered one throws the moment it executes.
 *
 * This is deliberately narrower than the check it replaces in exactly one
 * respect, and stronger in every other: a push on a branch nothing reaches is
 * not caught while it lies dormant. It cannot affect a verdict while dormant
 * either, and it fails closed the instant it becomes reachable.
 */
export function sealViolations(list, registry, registryName) {
  if (!Array.isArray(list)) {
    throw new Error(`validate-ledger: ${registryName} seal received ${typeof list}, not an array of violations`);
  }
  for (const v of list) {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      throw new Error(`validate-ledger: ${registryName} seal found a violation that is not an object: ${JSON.stringify(v)}`);
    }
    if (typeof v.rule !== 'string' || v.rule === '') {
      throw new Error(`validate-ledger: ${registryName} seal found a violation with no readable rule id: ${JSON.stringify(v)}`);
    }
    if (!registry.includes(v.rule)) {
      throw new Error(`validate-ledger: ${registryName} seal rejected unregistered rule id "${v.rule}" — every violation leaving this module must name a registered rule so it gets a mutant`);
    }
  }
  return list;
}

/**
 * Entry validation, returning one {rule, message} per violation.
 * `validateEntry` below flattens this to the string form the rest of the
 * pipeline already consumes, so the message text is unchanged.
 */
function entryRulesImpl(e, lineNo) {
  const v = [];
  const at = (rule, msg) => emit(v, ENTRY_RULES, 'ENTRY_RULES', rule, `line ${lineNo}: ${msg}`);

  if (typeof e !== 'object' || e === null || Array.isArray(e)) {
    at('entry-not-object', 'entry is not a JSON object');
    return v;
  }

  for (const k of REQUIRED_ALWAYS) {
    if (e[k] === undefined || e[k] === null || e[k] === '') {
      at(`missing-required:${k}`, `missing required field "${k}"`);
    }
  }

  // Exactly one status, from the closed set. Silence is a gap, not a pass.
  if (e.status !== undefined && !STATUSES.includes(e.status)) {
    at('status-not-in-set', `status "${e.status}" is not one of ${STATUSES.join(' | ')} — there is no fourth state`);
  }

  // CONFLICT must never be smuggled in as a status.
  if (e.status === 'CONFLICT') {
    at('conflict-as-status', 'CONFLICT is a sidecar field, never a status — record it beside the original entry');
  }

  if (e.status === 'VERIFIED') {
    if (!e.source_url) at('verified-no-source-url', 'VERIFIED requires source_url');
    else if (!/^https?:\/\//.test(e.source_url) && !e.source_url.startsWith('repo:')) {
      at('verified-source-url-shape', `VERIFIED source_url "${e.source_url}" is neither a URL nor a repo: path`);
    }
    if (!isIsoDate(e.access_date)) at('verified-no-access-date', 'VERIFIED requires access_date as YYYY-MM-DD');
    if (!e.quote) at('verified-no-quote', 'VERIFIED requires quote');
    else if (wordCount(e.quote) > MAX_QUOTE_WORDS) {
      at('verified-quote-too-long', `VERIFIED quote is ${wordCount(e.quote)} words, limit is ${MAX_QUOTE_WORDS}`);
    }
  }

  if (e.status === 'JUSTIFIED') {
    if (!e.confidence) at('justified-no-confidence', 'JUSTIFIED requires confidence');
    else if (!CONFIDENCES.includes(e.confidence)) {
      at('justified-confidence-not-in-set', `JUSTIFIED confidence "${e.confidence}" is not one of ${CONFIDENCES.join(' | ')}`);
    }
    if (!e.reasoning) at('justified-no-reasoning', 'JUSTIFIED requires reasoning — the justification IS the product');
    if (!e.best_available_source) at('justified-no-best-source', 'JUSTIFIED requires best_available_source');
  }

  if (e.status === 'GAP') {
    if (!e.reason) at('gap-no-reason', 'GAP requires reason');
    if (!e.recommended_action) at('gap-no-action', `GAP requires recommended_action (${GAP_ACTIONS.join(' | ')})`);
    else if (!GAP_ACTIONS.includes(e.recommended_action)) {
      at('gap-action-not-in-set', `GAP recommended_action "${e.recommended_action}" is not one of ${GAP_ACTIONS.join(' | ')}`);
    }
  }

  // Sidecar shape, when present.
  if (e.conflict !== undefined) {
    const c = e.conflict;
    if (typeof c !== 'object' || c === null || Array.isArray(c)) at('conflict-not-object', 'conflict must be an object sidecar');
    else {
      if (!c.engine_a || !c.engine_b) at('conflict-no-engines', 'conflict requires engine_a and engine_b');
      if (!c.disagreement) at('conflict-no-disagreement', 'conflict requires disagreement');
      if (c.overwrote_original) at('conflict-overwrote-original', 'conflict must never overwrite the original claim');
    }
  }

  if (e.feeds !== undefined && !Array.isArray(e.feeds)) at('feeds-not-array', 'feeds must be an array of course slugs or surfaces');
  if (e.check_by !== undefined && !isIsoDate(e.check_by)) at('check-by-not-iso', 'check_by must be YYYY-MM-DD');

  return v;
}

/**
 * Entry validation. Sealed: every violation returned names a registered
 * ENTRY_RULES id, whatever code path built it.
 */
export function validateEntryRules(e, lineNo) {
  return sealViolations(entryRulesImpl(e, lineNo), ENTRY_RULES, 'ENTRY_RULES');
}

/**
 * File validation. Sealed against RULES rather than FILE_RULES: this function
 * legitimately spreads entry-level violations into its own list, and those were
 * already sealed against ENTRY_RULES on the way in.
 */
export function validateFileRules(file) {
  const r = fileRulesImpl(file);
  sealViolations(r.violations, RULES, 'RULES');
  return r;
}

export function validateEntry(e, lineNo) {
  return validateEntryRules(e, lineNo).map((x) => x.message);
}

/**
 * File validation, returning one {rule, message} per violation.
 * `validateFile` flattens this to the existing string form.
 */
function fileRulesImpl(file) {
  const violations = [];
  const fileAt = (rule, message) => emit(violations, FILE_RULES, 'FILE_RULES', rule, message);

  if (!fs.existsSync(file)) {
    fileAt('file-missing', `missing ledger file: ${file}`);
    return { violations, count: 0 };
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
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
      fileAt('file-invalid-json', `line ${lineNo}: invalid JSON — ${err.message}`);
      return;
    }
    violations.push(...validateEntryRules(e, lineNo));
    if (e && e.id) {
      if (ids.has(e.id)) {
        fileAt('file-duplicate-id', `line ${lineNo}: duplicate id "${e.id}" (first seen line ${ids.get(e.id)})`);
      } else ids.set(e.id, lineNo);
    }
  });
  if (count === 0) {
    fileAt('file-empty', `${file} holds no entries — an empty ledger is not a clean ledger`);
  }
  return { violations, count };
}

export function validateFile(file) {
  const r = validateFileRules(file);
  const violations = r.violations.map((x) => x.message);
  return { ok: violations.length === 0, violations, count: r.count };
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
