#!/usr/bin/env node
/**
 * W0a — per-course evidence-ledger check (spec 11, AC-W0-1, AC-W0-2, AC-W0-8).
 *
 *   node scripts/check-evidence-ledger.mjs <ledger...> [--report] [--json]
 *        [--max-gap=N] [--baseline=FILE] [--answers=FILE]
 *
 * It REUSES scripts/audit/validate-ledger.mjs for the schema (statuses, required fields, CUT's
 * key_phrase, founder_only being a boolean) and adds only what needs the course around the
 * ledger: the check_owner on GAP rows, orphan surfaces, the founder-only rules and the CUT
 * rule. Those apply to ledgers under data/courses/<slug>/ only; any other ledger (the audit
 * ledger) gets the base schema and says so in the report.
 *
 * Exit codes (the lowest-numbered failing class wins, then 1):
 *   0  every rule passes
 *   1  GAP rows exceed --max-gap=N            message: "<n> GAP > <N>"
 *   2  usage error, or a file that cannot be read (ledger, baseline, answers)
 *   3  schema: bad JSON, status outside the closed set, GAP without reason / recommended_action
 *      / check_owner, CUT without key_phrase, founder_only not a boolean
 *   4  orphan: lesson_id or an also_in surface that is not in the course copy
 *   5  founder-only breach: baseline id deleted, relabelled (claim_class) or un-flagged, or a
 *      founder_only row that is not GAP whose answer_ref is not a row_id in the answers file
 *   6  cut not applied: a CUT row whose key_phrase still appears in the course copy
 * --report prints the counts per class and exits 0 on rule failures (2 still applies).
 * --json prints the same facts as JSON (with the GAP ids), for scripts.
 *
 * Baseline file: {"rows":[{"id":"X-001","claim_class":"standards-citation"}, ...]} — the
 * founder-only GAP rows frozen before the founder's answers are applied. Answers file: one
 * JSON object per line with at least {"row_id": "..."}; a row's answer_ref names a row_id.
 *
 * Course copy = the draft folder (data/courses/<slug>/v1-draft, JSON and .md, evidence/
 * excluded) or, for a course with no draft, data/seed/courses-catalog.json and
 * data/seed/<slug>-*.json; plus public/courses/<slug>/ (field tools, diagrams).
 *
 * Each course rule is emitted from exactly one `emit('<rule-id>', …)` site, so the test suite
 * can remove that rule alone (a source mutant) and prove its own case turns red.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFileRules } from './audit/validate-ledger.mjs';

export const CODES = { ok: 0, gap: 1, usage: 2, schema: 3, orphan: 4, founder: 5, cut: 6 };
const CLASS_ORDER = ['schema', 'orphan', 'founder', 'cut'];

/** Course rules and the class (exit code) each belongs to. */
export const COURSE_RULES = Object.freeze({
  'gap-no-check-owner': 'schema',
  'orphan-lesson-id': 'orphan',
  'orphan-also-in': 'orphan',
  'founder-baseline-id-missing': 'founder',
  'founder-claim-class-relabelled': 'founder',
  'founder-flag-dropped': 'founder',
  'founder-answer-ref-unresolved': 'founder',
  'cut-key-phrase-remains': 'cut',
});

class Unreadable extends Error {}

const posix = (p) => p.split(path.sep).join('/');

function readJsonLines(file, what) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    throw new Unreadable(`cannot read ${what} ${file}: ${e.code ?? e.message}`);
  }
  const out = [];
  text.split('\n').forEach((l, i) => {
    if (!l.trim()) return;
    try {
      out.push(JSON.parse(l));
    } catch (e) {
      throw new Unreadable(`${what} ${file} line ${i + 1} is not valid JSON`);
    }
  });
  return out;
}

function readBaseline(file) {
  let b;
  try {
    b = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Unreadable(`cannot read baseline ${file}: ${e.code ?? e.message}`);
  }
  if (!b || !Array.isArray(b.rows) || b.rows.some((r) => !r || typeof r.id !== 'string' || typeof r.claim_class !== 'string')) {
    throw new Unreadable(`baseline ${file} must be {"rows":[{"id","claim_class"}, ...]}`);
  }
  return b.rows;
}

/** Where a ledger's course lives. null when the ledger is not under data/courses/<slug>/. */
function locateCourse(ledger) {
  const p = posix(path.resolve(ledger));
  const m = p.match(/^(.*)\/data\/courses\/([^/]+)\//);
  if (!m) return null;
  return { repoRoot: m[1], slug: m[2], courseDir: `${m[1]}/data/courses/${m[2]}` };
}

function listFiles(dir, skip = () => false) {
  const out = [];
  const walk = (d) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const f = `${d}/${e.name}`;
      if (e.isDirectory()) {
        if (!skip(e.name)) walk(f);
      } else out.push(f);
    }
  };
  walk(dir);
  return out;
}

function courseCopy({ repoRoot, slug, courseDir }) {
  const draft = `${courseDir}/v1-draft`;
  let files;
  if (fs.existsSync(draft)) {
    files = listFiles(draft, (n) => n === 'evidence').filter((f) => /\.(json|md)$/.test(f) && !f.endsWith('research-pack.md'));
  } else {
    const seed = `${repoRoot}/data/seed`;
    files = fs.existsSync(seed)
      ? fs.readdirSync(seed).filter((n) => n === 'courses-catalog.json' || (n.startsWith(`${slug}-`) && n.endsWith('.json'))).map((n) => `${seed}/${n}`)
      : [];
  }
  files = files.concat(listFiles(`${repoRoot}/public/courses/${slug}`));
  const text = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
  return { files, text };
}

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ');

/** Does this surface token resolve to something in the course copy? */
function surfaceResolves(token, copy) {
  let t = String(token);
  if (/^course:[^#]+$/.test(t)) return copy.files.length > 0; // the bare course
  t = t.replace(/^course:[^#]+#/, '');
  const m = t.match(/^(quiz:|field-tool:|diagram:)?(.*)$/);
  const kind = m[1] ?? '';
  const key = m[2];
  if (kind === 'field-tool:' || kind === 'diagram:') return copy.files.some((f) => f.endsWith(`/${key}`));
  if (key === 'description') return [...copy.text.values()].some((x) => x.includes('"description"'));
  if (key === 'assessment') return copy.files.some((f) => /assessment/.test(path.basename(f)));
  return key !== '' && [...copy.text.values()].some((x) => x.includes(key));
}

/**
 * Check one ledger. Returns {ledger, rows, schema, orphan, founder, cut, gap, gapIds, notes}
 * where each class is a list of {rule, line, message}.
 */
export function checkLedger(ledger, { baseline, answers } = {}) {
  if (!fs.existsSync(ledger)) throw new Unreadable(`cannot read ledger ${ledger}: ENOENT`);
  const result = { ledger, rows: 0, schema: [], orphan: [], founder: [], cut: [], gap: 0, gapIds: [], notes: [] };
  const emit = (rule, line, message) => {
    const cls = COURSE_RULES[rule];
    if (!cls) throw new Error(`check-evidence-ledger: unregistered rule id "${rule}"`);
    result[cls].push({ rule, line, message: `${line ? `line ${line}: ` : ''}${message}` });
  };

  // Base schema, from the one validator.
  const base = validateFileRules(ledger);
  result.rows = base.count;
  for (const v of base.violations) {
    const m = v.message.match(/^line (\d+):/);
    result.schema.push({ rule: v.rule, line: m ? Number(m[1]) : 0, message: v.message });
  }

  const rows = [];
  fs.readFileSync(ledger, 'utf8').split('\n').forEach((l, i) => {
    if (!l.trim()) return;
    try {
      const r = JSON.parse(l);
      if (r && typeof r === 'object' && !Array.isArray(r)) rows.push({ r, line: i + 1 });
    } catch {
      /* already reported as file-invalid-json */
    }
  });
  const gapRows = rows.filter(({ r }) => r.status === 'GAP');
  result.gap = gapRows.length;
  result.gapIds = gapRows.map(({ r }) => r.id);

  const course = locateCourse(ledger);
  if (!course) {
    result.notes.push('course rules skipped: not a ledger under data/courses/<slug>/ (base schema only)');
    return result;
  }

  for (const { r, line } of gapRows) {
    if (typeof r.check_owner !== 'string' || r.check_owner.trim() === '') {
      emit('gap-no-check-owner', line, `GAP row ${r.id ?? '?'} has no check_owner`);
    }
  }

  const copy = courseCopy(course);
  for (const { r, line } of rows) {
    if (r.lesson_id !== undefined && !surfaceResolves(String(r.lesson_id), copy)) {
      emit('orphan-lesson-id', line, `row ${r.id ?? '?'} lesson_id "${r.lesson_id}" is not in the course copy`);
    }
    for (const s of Array.isArray(r.also_in) ? r.also_in : []) {
      if (!surfaceResolves(String(s), copy)) {
        emit('orphan-also-in', line, `row ${r.id ?? '?'} also_in surface "${s}" is not in the course copy`);
      }
    }
  }

  if (baseline) {
    const byId = new Map(rows.map(({ r, line }) => [r.id, { r, line }]));
    for (const b of baseline) {
      const hit = byId.get(b.id);
      if (!hit) {
        emit('founder-baseline-id-missing', 0, `founder-only baseline row ${b.id} is no longer in the ledger`);
        continue;
      }
      if (hit.r.claim_class !== b.claim_class) {
        emit('founder-claim-class-relabelled', hit.line, `founder-only row ${b.id} claim_class changed from "${b.claim_class}" to "${hit.r.claim_class}"`);
      }
      if (hit.r.founder_only !== true) {
        emit('founder-flag-dropped', hit.line, `founder-only baseline row ${b.id} no longer has founder_only: true`);
      }
    }
  }

  const answerIds = new Set((answers ?? []).map((a) => a && a.row_id));
  for (const { r, line } of rows) {
    if (r.founder_only === true && r.status !== 'GAP' && !(typeof r.answer_ref === 'string' && answerIds.has(r.answer_ref))) {
      emit('founder-answer-ref-unresolved', line, `founder-only row ${r.id ?? '?'} is ${r.status} but answer_ref "${r.answer_ref ?? ''}" is not a row_id in the answers file`);
    }
  }

  for (const { r, line } of rows.filter(({ r: x }) => x.status === 'CUT' && typeof x.key_phrase === 'string' && x.key_phrase.trim() !== '')) {
    const needle = norm(r.key_phrase).trim();
    const where = copy.files.length === 0
      ? ['no course copy found, so the phrase cannot be shown absent']
      : [...copy.text].filter(([, t]) => norm(t).includes(needle)).map(([f]) => path.relative(course.repoRoot, f));
    if (where.length > 0) emit('cut-key-phrase-remains', line, `CUT row ${r.id ?? '?'} key_phrase "${r.key_phrase}" still appears: ${where.join(', ')}`);
  }
  return result;
}

const rowsViolating = (list) => new Set(list.map((v) => (v.line ? `L${v.line}` : `F${v.rule}${v.message}`))).size;

function parseArgs(argv) {
  const o = { ledgers: [], report: false, json: false, maxGap: null, baseline: null, answers: null };
  for (const a of argv) {
    if (a === '--report') o.report = true;
    else if (a === '--json') o.json = true;
    else if (a.startsWith('--max-gap=')) {
      const n = a.slice('--max-gap='.length);
      if (!/^\d+$/.test(n)) throw new Unreadable(`--max-gap needs a whole number, got "${n}"`);
      o.maxGap = Number(n);
    } else if (a.startsWith('--baseline=')) o.baseline = a.slice('--baseline='.length);
    else if (a.startsWith('--answers=')) o.answers = a.slice('--answers='.length);
    else if (a.startsWith('--')) throw new Unreadable(`unknown option ${a}`);
    else o.ledgers.push(a);
  }
  if (o.ledgers.length === 0) throw new Unreadable('usage: check-evidence-ledger.mjs <ledger...> [--report] [--json] [--max-gap=N] [--baseline=FILE] [--answers=FILE]');
  return o;
}

function main(argv) {
  let o;
  let results;
  try {
    o = parseArgs(argv);
    const baseline = o.baseline ? readBaseline(o.baseline) : undefined;
    const answers = o.answers ? readJsonLines(o.answers, 'answers file') : undefined;
    results = o.ledgers.map((l) => checkLedger(l, { baseline, answers }));
  } catch (e) {
    if (!(e instanceof Unreadable)) throw e;
    console.error(`check-evidence-ledger: ${e.message}`);
    return CODES.usage;
  }

  const failing = new Set();
  const gapMessages = [];
  for (const r of results) {
    for (const c of CLASS_ORDER) if (r[c].length > 0) failing.add(c);
    if (o.maxGap !== null && r.gap > o.maxGap) {
      failing.add('gap');
      gapMessages.push(`${r.ledger}: ${r.gap} GAP > ${o.maxGap}`);
    }
  }
  const failClass = [...CLASS_ORDER, 'gap'].find((c) => failing.has(c));
  const code = o.report || !failClass ? CODES.ok : CODES[failClass];

  if (o.json) {
    console.log(JSON.stringify({
      code,
      ledgers: results.map((r) => ({
        ledger: r.ledger,
        rows: r.rows,
        schema: rowsViolating(r.schema),
        orphan: r.orphan.length,
        founder: r.founder.length,
        cut: r.cut.length,
        gap: r.gap,
        gap_ids: r.gapIds,
        notes: r.notes,
        violations: Object.fromEntries(CLASS_ORDER.map((c) => [c, r[c].map((v) => ({ rule: v.rule, message: v.message }))])),
      })),
    }, null, 2));
    return code;
  }

  if (o.report) {
    for (const r of results) {
      console.log(r.ledger);
      console.log(`  rows: ${r.rows}`);
      console.log(`  schema: ${rowsViolating(r.schema)}`);
      console.log(`  orphan: ${r.orphan.length}`);
      console.log(`  founder: ${r.founder.length}`);
      console.log(`  cut: ${r.cut.length}`);
      console.log(`  gap: ${r.gap}`);
      for (const n of r.notes) console.log(`  note: ${n}`);
    }
    return code;
  }

  for (const r of results) {
    for (const c of CLASS_ORDER) for (const v of r[c]) console.error(`${r.ledger}: [${c}:${v.rule}] ${v.message}`);
  }
  for (const m of gapMessages) console.error(m);
  if (failClass) console.error(`check-evidence-ledger: FAIL (${failClass}, exit ${code})`);
  else console.log(`check-evidence-ledger: ${results.length} ledger(s) pass`);
  return code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
