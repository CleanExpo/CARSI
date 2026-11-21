#!/usr/bin/env node
/**
 * W0a tests for scripts/check-evidence-ledger.mjs (AC-W0-1).
 *
 *   node --test scripts/check-evidence-ledger.test.mjs
 *
 * Every rule has its own case: a planted defect that must exit with the rule's code and name
 * the rule. Then, for every rule, a SOURCE MUTANT removes that rule alone (the single
 * `emit('<rule>',` / `at('<rule>',` call becomes a no-op) in a scratch copy of the scripts, and
 * the suite asserts exactly that rule's case turns red while every other case stays green. A
 * stub that exits 0 must turn every defect case red. The cases run against LEDGER_CHECK_BIN
 * when set, so `LEDGER_CHECK_BIN=<mutant> node --test ...` shows the suite red from outside.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_BIN = path.join(HERE, 'check-evidence-ledger.mjs');
const REAL_VALIDATOR = path.join(HERE, 'audit', 'validate-ledger.mjs');
const BIN = process.env.LEDGER_CHECK_BIN ?? REAL_BIN;

const L1 = '11111111-1111-4111-8111-111111111111';
const L2 = '22222222-2222-4222-8222-222222222222';
const surface = (id) => `course:demo#${id}`;

const verified = (extra = {}) => ({
  id: 'D-001', claim: 'A plain checked fact.', claim_class: 'electrical', surface: surface(L1), status: 'VERIFIED',
  feeds: ['course:demo'], lesson_id: L1, part: 'requirement', evidence_grade: 'A1',
  source_url: 'https://www.legislation.gov.au/example', access_date: '2026-11-20', quote: 'Nominal supply voltage is 230 V.',
  also_in: [surface('description')], ...extra,
});
const gapRow = (extra = {}) => ({
  id: 'D-002', claim: 'A claim only the founder can settle.', claim_class: 'standards-citation', surface: surface(L1), status: 'GAP',
  reason: 'Needs the licensed copy.', recommended_action: 'substantiate', feeds: ['course:demo'], lesson_id: L1,
  check_owner: 'Phill (SME)', founder_only: true, ...extra,
});
const cutRow = (extra = {}) => ({
  id: 'D-003', claim: 'A claim that was cut.', claim_class: 'banned-language', surface: surface(L1), status: 'CUT',
  key_phrase: 'miracle cure', feeds: ['course:demo'], lesson_id: L1, ...extra,
});

/** A scratch repo with one clean demo course. Returns helpers to change it. */
function fixture({ rows = [verified(), gapRow(), cutRow()], catalogExtra = '', answers = null, baseline = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'w0a-ledger-'));
  const draft = path.join(root, 'data/courses/demo/v1-draft');
  fs.mkdirSync(path.join(draft, 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public/courses/demo/field-tools'), { recursive: true });
  fs.writeFileSync(path.join(draft, 'courses-catalog.json'), JSON.stringify({ description: 'Demo', lessons: [{ id: L1 }, { id: L2 }], note: catalogExtra }));
  fs.writeFileSync(path.join(draft, 'demo-assessment.json'), '{}');
  fs.writeFileSync(path.join(root, 'public/courses/demo/field-tools/card.md'), 'A card.');
  const ledger = path.join(draft, 'evidence/evidence-ledger.jsonl');
  const write = (r) => fs.writeFileSync(ledger, r.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n') + '\n');
  write(rows);
  const extra = [];
  if (answers) {
    const f = path.join(root, 'founder-answers.jsonl');
    fs.writeFileSync(f, answers.map((a) => JSON.stringify(a)).join('\n') + '\n');
    extra.push(`--answers=${f}`);
  }
  if (baseline) {
    const f = path.join(root, 'founder-only-baseline.json');
    fs.writeFileSync(f, JSON.stringify({ rows: baseline }));
    extra.push(`--baseline=${f}`);
  }
  return { root, ledger, extra };
}

function run(bin, args) {
  const r = spawnSync('node', [bin, ...args], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const BASELINE = [{ id: 'D-002', claim_class: 'standards-citation' }];
const ANSWERS = [{ row_id: 'D-002', answer: 'fix', text: 'ok', source: 'review-page' }];
const founderCut = (extra = {}) => cutRow({ id: 'D-002', claim_class: 'standards-citation', founder_only: true, answer_ref: 'D-002', ...extra });

/**
 * One case per rule. `rule` is the id that must be named in the output; `code` the exit code.
 * `build` returns the fixture; `args` are extra CLI args after the ledger and fixture extras.
 */
const CASES = [
  { name: 'clean course passes with baseline and answers', rule: null, code: 0,
    build: () => fixture({ rows: [verified(), founderCut(), cutRow({ id: 'D-004' })], answers: ANSWERS, baseline: BASELINE }) },
  { name: 'status with a trailing space ("GAP ") is rejected', rule: 'status-not-in-set', code: 3,
    build: () => fixture({ rows: [verified(), gapRow({ status: 'GAP ' })] }) },
  { name: 'GAP row without check_owner is rejected', rule: 'gap-no-check-owner', code: 3,
    build: () => fixture({ rows: [verified(), gapRow({ check_owner: undefined })] }) },
  { name: 'also_in surface that is not in the course is an orphan', rule: 'orphan-also-in', code: 4,
    build: () => fixture({ rows: [verified({ also_in: [surface('99999999-9999-4999-8999-999999999999')] })] }) },
  { name: 'also_in present but not an array is a schema failure', rule: 'also-in-not-array', code: 3,
    build: () => fixture({ rows: [verified({ also_in: surface('missing-surface') })] }) },
  { name: 'also_in element that is not a string is a schema failure', rule: 'also-in-element-not-string', code: 3,
    build: () => fixture({ rows: [verified({ also_in: [surface('description'), 7] })] }) },
  { name: 'lesson_id that is not in the course is an orphan', rule: 'orphan-lesson-id', code: 4,
    build: () => fixture({ rows: [verified({ lesson_id: '99999999-9999-4999-8999-999999999999' })] }) },
  { name: 'founder-only id from the baseline deleted from the ledger', rule: 'founder-baseline-id-missing', code: 5,
    build: () => fixture({ rows: [verified()], baseline: BASELINE }) },
  { name: 'claim_class relabelled on a founder-only row', rule: 'founder-claim-class-relabelled', code: 5,
    build: () => fixture({ rows: [verified(), gapRow({ claim_class: 'workload' })], baseline: BASELINE }) },
  { name: 'founder_only flag dropped from a baseline row', rule: 'founder-flag-dropped', code: 5,
    build: () => fixture({ rows: [verified(), gapRow({ founder_only: false })], baseline: BASELINE }) },
  { name: 'answer_ref absent from founder-answers.jsonl', rule: 'founder-answer-ref-unresolved', code: 5,
    build: () => fixture({ rows: [verified(), founderCut({ answer_ref: 'made-up-id' })], answers: ANSWERS, baseline: BASELINE }) },
  { name: 'CUT row whose key_phrase still appears in the course copy', rule: 'cut-key-phrase-remains', code: 6,
    build: () => fixture({ rows: [verified(), cutRow()], catalogExtra: 'This Miracle   Cure works.' }) },
];

const runCase = (bin, c) => {
  const fx = c.build();
  try {
    const r = run(bin, [fx.ledger, ...fx.extra]);
    return { ...r, pass: r.code === c.code && (c.rule === null || r.out.includes(`:${c.rule}]`)) };
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
};

describe('each rule fires on its own planted defect', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const r = runCase(BIN, c);
      assert.ok(r.pass, `expected exit ${c.code}${c.rule ? ` naming ${c.rule}` : ''}, got exit ${r.code}:\n${r.out}`);
    });
  }
});

describe('options and exit codes', () => {
  it('--max-gap exits 1 with "<n> GAP > K", and passes at the limit', () => {
    const fx = fixture({ rows: [verified(), gapRow(), gapRow({ id: 'D-009' })] });
    const over = run(BIN, [fx.ledger, '--max-gap=1']);
    assert.equal(over.code, 1);
    assert.match(over.out, /2 GAP > 1/);
    assert.equal(run(BIN, [fx.ledger, '--max-gap=2']).code, 0);
  });
  it('--report prints schema and gap counts and exits 0 even on a broken ledger', () => {
    const fx = fixture({ rows: [verified(), gapRow({ check_owner: undefined }), gapRow({ id: 'D-009' })] });
    const r = run(BIN, [fx.ledger, '--report']);
    assert.equal(r.code, 0);
    assert.match(r.out, /^ {2}schema: 1$/m);
    assert.match(r.out, /^ {2}gap: 2$/m);
  });
  it('--report --json returns the GAP ids', () => {
    const fx = fixture({ rows: [verified(), gapRow(), gapRow({ id: 'D-009' })] });
    const j = JSON.parse(run(BIN, [fx.ledger, '--report', '--json']).out);
    assert.deepEqual(j.ledgers[0].gap_ids, ['D-002', 'D-009']);
    assert.equal(j.ledgers[0].gap, 2);
  });
  it('a bad JSON line is a schema failure (3)', () => {
    const fx = fixture({ rows: [verified(), '{not json'] });
    assert.equal(run(BIN, [fx.ledger]).code, 3);
  });
  it('the lowest-numbered failing class wins (schema 3 over orphan 4)', () => {
    const fx = fixture({ rows: [gapRow({ check_owner: undefined, also_in: ['quiz:99999999-9999-4999-8999-999999999999'] })] });
    assert.equal(run(BIN, [fx.ledger]).code, 3);
  });
  it('an unreadable ledger, a malformed baseline and an unknown option exit 2', () => {
    const fx = fixture();
    assert.equal(run(BIN, [path.join(fx.root, 'nope.jsonl')]).code, 2);
    const bad = path.join(fx.root, 'bad-baseline.json');
    fs.writeFileSync(bad, '{"ids":["D-002"]}');
    assert.equal(run(BIN, [fx.ledger, `--baseline=${bad}`]).code, 2);
    assert.equal(run(BIN, [fx.ledger, '--bogus']).code, 2);
    assert.equal(run(BIN, []).code, 2);
  });
  it('a ledger outside data/courses gets the base schema only, and says so', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w0a-audit-'));
    const f = path.join(dir, 'evidence-ledger.jsonl');
    fs.writeFileSync(f, JSON.stringify(gapRow({ check_owner: undefined, surface: 'https://x.test', lesson_id: undefined })) + '\n');
    const r = run(BIN, [f, '--report']);
    assert.match(r.out, /course rules skipped/);
    assert.match(r.out, /^ {2}schema: 0$/m);
  });
});

/** Discovery-sweep classes (97af5b46): each case is a planted defect that exited 0 or the wrong class before the fix. */
describe('discovery classes', () => {
  const OTHER = '99999999-9999-4999-8999-999999999999';
  const exitOf = (fx, extra = []) => run(BIN, [fx.ledger, ...fx.extra, ...extra]);
  const done = (fx) => fs.rmSync(fx.root, { recursive: true, force: true });

  it('a bare or scoped surface of ANOTHER course is unresolved (4); the ledger\'s own course resolves', () => {
    for (const s of ['course:another-course', `course:another-course#${L1}`, `course:another-course#description`]) {
      const fx = fixture({ rows: [verified({ also_in: [s] })] });
      const r = exitOf(fx);
      assert.equal(r.code, 4, `${s}: ${r.out}`);
      assert.match(r.out, /orphan-also-in/);
      done(fx);
    }
    const ok = fixture({ rows: [verified({ also_in: ['course:demo', `course:demo#${L2}`] })] });
    assert.equal(exitOf(ok).code, 0);
    done(ok);
  });
  it('an id that appears only in unrelated copy text is an orphan, for lesson_id and also_in alike', () => {
    const a = fixture({ rows: [verified({ lesson_id: OTHER })], catalogExtra: `see ${OTHER}` });
    const ra = exitOf(a);
    assert.equal(ra.code, 4, ra.out);
    assert.match(ra.out, /orphan-lesson-id/);
    done(a);
    const b = fixture({ rows: [verified({ also_in: ['course:demo#accidental'] })], catalogExtra: 'accidental' });
    const rb = exitOf(b);
    assert.equal(rb.code, 4, rb.out);
    assert.match(rb.out, /orphan-also-in/);
    done(b);
  });
  it('a CUT key_phrase stored \\u-escaped in JSON copy is still found (6)', () => {
    const fx = fixture({ rows: [verified(), cutRow({ key_phrase: 'caf\u00e9' })] });
    fs.writeFileSync(path.join(fx.root, 'data/courses/demo/v1-draft/extra.json'), '{"title":"This caf\\u00e9 works"}');
    const r = exitOf(fx);
    assert.equal(r.code, 6, r.out);
    assert.match(r.out, /cut-key-phrase-remains/);
    done(fx);
  });
  it('another row\'s answer does not satisfy a founder-only row (5)', () => {
    const fx = fixture({ rows: [verified(), founderCut({ answer_ref: 'OTHER' })], answers: [{ row_id: 'OTHER' }], baseline: BASELINE });
    const r = exitOf(fx);
    assert.equal(r.code, 5, r.out);
    assert.match(r.out, /founder-answer-ref-unresolved/);
    done(fx);
  });
  it('an invalid status reports only the schema error, not the founder answer rule', () => {
    const fx = fixture({ rows: [verified(), gapRow({ status: 'GAP ' })] });
    const r = exitOf(fx);
    assert.equal(r.code, 3);
    assert.match(r.out, /status-not-in-set/);
    assert.doesNotMatch(r.out, /founder-answer-ref-unresolved/);
    done(fx);
  });
  it('unreadable course copy is a controlled error (2) naming the path, with no stack trace', () => {
    const fx = fixture();
    const link = path.join(fx.root, 'data/courses/demo/v1-draft/broken.md');
    fs.symlinkSync(path.join(fx.root, 'does-not-exist.md'), link);
    const r = exitOf(fx);
    assert.equal(r.code, 2, r.out);
    assert.ok(r.out.includes('broken.md'), r.out);
    assert.doesNotMatch(r.out, /node:internal|\n\s+at /);
    done(fx);
  });
  it('--max-gap rejects an integer too large to compare exactly (2)', () => {
    const fx = fixture();
    const r = exitOf(fx, ['--max-gap=9007199254740993']);
    assert.equal(r.code, 2, r.out);
    assert.match(r.out, /--max-gap/);
    assert.equal(exitOf(fx, ['--max-gap=9007199254740991']).code, 0);
    done(fx);
  });
});

/** Scratch copy of the two scripts with one rule's emit call turned into a no-op. */
function mutantBin(file, ruleId, call) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w0a-mutant-'));
  fs.mkdirSync(path.join(dir, 'audit'));
  const patch = { checker: REAL_BIN, validator: REAL_VALIDATOR };
  let src = fs.readFileSync(patch[file], 'utf8');
  const find = `${call}('${ruleId}',`;
  const n = src.split(find).length - 1;
  assert.equal(n, 1, `${find} must appear exactly once in ${file} (found ${n}); a rule needs one emit site`);
  src = src.replace(find, 'void (');
  fs.writeFileSync(path.join(dir, file === 'checker' ? 'check-evidence-ledger.mjs' : 'audit/validate-ledger.mjs'), src);
  fs.copyFileSync(file === 'checker' ? REAL_VALIDATOR : REAL_BIN, path.join(dir, file === 'checker' ? 'audit/validate-ledger.mjs' : 'check-evidence-ledger.mjs'));
  return { dir, bin: path.join(dir, 'check-evidence-ledger.mjs') };
}

describe('GP-743: a multi-course catalog only counts this course for CUT phrases', () => {
  const catalog = (otherNote, demoNote = '') =>
    JSON.stringify({
      courses: [
        { slug: 'demo', description: 'Demo', note: demoNote, lessons: [{ id: L1 }, { id: L2 }] },
        { slug: 'other', description: 'Another course', note: otherNote, lessons: [{ id: 'x-1' }] },
      ],
    });

  it("another course's copy carrying the cut phrase is not a failure", () => {
    const fx = fixture();
    fs.writeFileSync(path.join(fx.root, 'data/courses/demo/v1-draft/courses-catalog.json'), catalog('a miracle cure'));
    const r = run(BIN, [fx.ledger, ...fx.extra]);
    assert.equal(r.code, 0, r.out);
  });

  it('the same phrase in this course\'s own entry still fails (exit 6)', () => {
    const fx = fixture();
    fs.writeFileSync(path.join(fx.root, 'data/courses/demo/v1-draft/courses-catalog.json'), catalog('', 'a miracle cure'));
    const r = run(BIN, [fx.ledger, ...fx.extra]);
    assert.equal(r.code, 6, r.out);
  });
});

describe('source mutants: removing one rule turns exactly its own case red', () => {
  const rules = CASES.filter((c) => c.rule !== null);
  for (const c of rules) {
    it(`without ${c.rule}`, () => {
      const m = c.rule === 'status-not-in-set' ? mutantBin('validator', c.rule, 'at') : mutantBin('checker', c.rule, 'emit');
      try {
        for (const other of CASES) {
          const r = runCase(m.bin, other);
          if (other === c) assert.equal(r.pass, false, `mutant without ${c.rule} still passed its own case "${other.name}" — the case does not need the rule`);
          else assert.equal(r.pass, true, `mutant without ${c.rule} broke an unrelated case "${other.name}":\n${r.out}`);
        }
      } finally {
        fs.rmSync(m.dir, { recursive: true, force: true });
      }
    });
  }

  it('a stub that exits 0 turns every defect case red', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w0a-stub-'));
    const stub = path.join(dir, 'stub.mjs');
    fs.writeFileSync(stub, 'process.exit(0);\n');
    try {
      for (const c of CASES.filter((x) => x.rule !== null)) assert.equal(runCase(stub, c).pass, false, `stub passed "${c.name}"`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
