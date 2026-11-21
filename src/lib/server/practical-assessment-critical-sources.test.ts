import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { gradeRubric } from '@/lib/practical-assessment-grading';

/**
 * GP-729 class guard. Criticality lives in the `critical` flag, never in prose. Every
 * rubric source in the repo is scanned: a criterion whose label or description says it
 * fails the whole assessment must carry "critical": true, or the grader would let a
 * learner pass who must fail. Conditional wording such as "(critical for the tap test)"
 * is not an automatic fail and is deliberately not matched.
 */
const ROOT = process.cwd();

const FAILS_WHOLE_ASSESSMENT =
  /zero[\s-]*tolerance|auto(matic(ally)?)?[\s-]*fail|fails?\s+(the\s+)?(whole|entire)\s+assessment|\(\s*critical\s*\)/i;

type RawCriterion = { label?: unknown; description?: unknown; maxPoints?: unknown; critical?: unknown };

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Every rubric source: seed and course assessment JSON files. */
function rubricFiles(): string[] {
  const seed = readdirSync(join(ROOT, 'data', 'seed'))
    .filter((n) => /assessment.*\.json$/i.test(n))
    .map((n) => join(ROOT, 'data', 'seed', n));
  const courses = walk(join(ROOT, 'data', 'courses')).filter((p) => /assessment.*\.json$/i.test(p));
  return [...seed, ...courses];
}

function criteriaOf(file: string): RawCriterion[] | null {
  const j = JSON.parse(readFileSync(file, 'utf8')) as {
    assessment?: { criteria?: RawCriterion[] };
    criteria?: RawCriterion[];
  };
  return j.assessment?.criteria ?? j.criteria ?? null;
}

describe('rubric sources: prose that fails the assessment must be a critical flag', () => {
  const files = rubricFiles();

  it('finds the rubric sources (positive control)', () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
    expect(files.some((f) => f.endsWith('ccw-truckmount-assessment.json'))).toBe(true);
    expect(files.some((f) => f.endsWith('hard-floor-care-assessment.json'))).toBe(true);
  });

  it('the wording pattern matches the known phrases and not conditional wording', () => {
    expect(FAILS_WHOLE_ASSESSMENT.test('Carbon monoxide controls — ZERO-TOLERANCE (automatic fail)')).toBe(true);
    expect(FAILS_WHOLE_ASSESSMENT.test('Pre-job check (critical)')).toBe(true);
    expect(FAILS_WHOLE_ASSESSMENT.test('Any miss fails the whole assessment')).toBe(true);
    expect(FAILS_WHOLE_ASSESSMENT.test('Tile and grout (critical for the tap test)')).toBe(false);
  });

  for (const file of files) {
    it(`${file.slice(ROOT.length + 1)}`, () => {
      const criteria = criteriaOf(file);
      if (!criteria) return;
      const unflagged = criteria
        .filter((c) => FAILS_WHOLE_ASSESSMENT.test(`${c.label ?? ''} ${c.description ?? ''}`))
        .filter((c) => c.critical !== true)
        .map((c) => String(c.label));
      expect(unflagged).toEqual([]);
    });
  }
});

describe('the real CCW truck-mount seed', () => {
  it('fails the whole assessment on a failed CO criterion at 40/50 (80%)', () => {
    const criteria = criteriaOf(join(ROOT, 'data', 'seed', 'ccw-truckmount-assessment.json'))!;
    const rows = criteria.map((c, i) => ({
      id: `c${i}`,
      label: String(c.label),
      maxPoints: Number(c.maxPoints),
      critical: c.critical === true,
    }));
    const co = rows.find((r) => /carbon monoxide/i.test(r.label))!;
    const scores = Object.fromEntries(rows.map((r) => [r.id, r.id === co.id ? 0 : r.maxPoints]));
    const g = gradeRubric({ criteria: rows, scores, passThreshold: 80 });
    expect(g.passed).toBe(false);
    expect(g.failedCriticalCriteria).toEqual([co.label]);
  });
});
