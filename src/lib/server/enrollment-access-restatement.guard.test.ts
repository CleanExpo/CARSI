import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * GP-787: "has access" for a course enrolment has one owner, `enrollment-access.ts`
 * (`isEnrolmentAccessAllowed`, and `ACCESS_GRANTING_STATUS_LIST` for a Prisma `where`). Older code
 * wrote its own version (`status: { notIn: ['cancelled'] }`, `status: { not: 'revoked' }`), which
 * let a refunded or revoked enrolment count as access. This guard fails when any source file
 * filters an enrolment query on `status` with its own list (`in`, `notIn` or `not` with a literal)
 * instead of the shared list.
 *
 * What it reads: every non-test .ts/.tsx file under `src/` and `app/`; the argument of each
 * `lmsEnrollment.<read>(...)` call, and every `enrollments: {...}` / `enrollment: {...}` relation
 * filter. Limits (not covered): a `where` built in a separate variable and passed in, raw SQL, and
 * plain JS comparisons such as `row.status === 'active'` (use `isEnrolmentAccessAllowed` there).
 * A single-status equality (`status: 'active'`) is a state transition, not the access rule, and is
 * not flagged.
 */

const ROOT = path.resolve(__dirname, '../../..');
const SCAN_DIRS = ['src', 'app'];

/**
 * Files allowed to keep a literal enrolment status filter, each with its reason. A stale entry
 * (the file no longer has a finding) fails the guard, so this list cannot rot.
 */
const ALLOWED: Record<string, string> = {
  'src/lib/server/team-member-provision.ts':
    "GP-787 item 1: the owner check in addCourseTeamMemberByEmail still uses notIn ['cancelled']. Held back because the GP-759 branch (fix/gp-759-paid-elsewhere-main) changes that function; fix it after that branch merges, then remove this entry.",
  'src/lib/server/team-course-seats.ts':
    "GP-787 item 2: the older (no seat block) seat count still uses notIn ['cancelled']. Held back with item 1: counting only access-granting seats while the owner check still accepts a revoked owner would free that owner's seat for them to give away. Fix together with item 1, then remove this entry.",
};

const READ_CALL = /\blmsEnrollment\s*\.\s*(findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|count|aggregate|groupBy|updateMany|deleteMany)\s*\(/g;
const RELATION_KEY = /\benrollments?\s*:\s*\{/g;

/** Text from `open` (an opening bracket) to its matching close, skipping string literals. */
function balanced(src: string, open: number): string {
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (pairs[ch]) stack.push(pairs[ch]);
    else if (ch === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

/** `status:` filters in a query fragment that restate the rule with a literal list. */
function restatedStatusFilters(fragment: string): string[] {
  const out: string[] = [];
  const re = /\bstatus\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) {
    const value = balanced(fragment, m.index + m[0].length - 1);
    const literalList = /\b(in|notIn)\s*:\s*\[\s*['"`]/.test(value);
    const negation = /\bnot\s*:/.test(value) || /\bnotIn\s*:/.test(value);
    if (literalList || negation) out.push(`status: ${value.replace(/\s+/g, ' ')}`);
  }
  return out;
}

function findRestatements(src: string): string[] {
  const findings: string[] = [];
  for (const re of [READ_CALL, RELATION_KEY]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const line = src.slice(0, m.index).split('\n').length;
      for (const f of restatedStatusFilters(balanced(src, m.index + m[0].length - 1))) {
        findings.push(`line ${line}: ${f}`);
      }
    }
  }
  return [...new Set(findings)];
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec|fixtures)\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function scanTree(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const d of SCAN_DIRS) {
    for (const file of sourceFiles(path.join(ROOT, d))) {
      const findings = findRestatements(readFileSync(file, 'utf8'));
      if (findings.length > 0) result[path.relative(ROOT, file).split(path.sep).join('/')] = findings;
    }
  }
  return result;
}

describe('GP-787: enrolment access has one owner', () => {
  it('fires on a planted restatement (positive control)', () => {
    const planted = [
      "await prisma.lmsEnrollment.findMany({ where: { studentId, status: { notIn: ['cancelled'] } } });",
      "await db.lmsEnrollment.count({ where: { courseId, status: { not: 'revoked' } } });",
      "await tx.lmsEnrollment.findFirst({ where: { status: { in: ['active', 'completed'] } } });",
      "await prisma.lmsUser.findMany({ where: { enrollments: { some: { status: { notIn: ['revoked'] } } } } });",
    ];
    for (const src of planted) expect(findRestatements(src), src).toHaveLength(1);
  });

  it('accepts the shared list and other models (negative control)', () => {
    const fine = [
      'await prisma.lmsEnrollment.findMany({ where: { studentId, status: { in: [...ACCESS_GRANTING_STATUS_LIST] } } });',
      "await prisma.lmsEnrollment.findFirst({ where: { id, status: 'completed' } });",
      "await prisma.carsiCoachingAction.findMany({ where: { status: { in: ['todo', 'done'] } } });",
      "await prisma.lmsEnrollment.findMany({ where: { studentId }, include: { course: { select: { status: true } } } });",
    ];
    for (const src of fine) expect(findRestatements(src), src).toEqual([]);
  });

  it('finds the scan surface (so an empty result is not a blind scan)', () => {
    const files = SCAN_DIRS.flatMap((d) => sourceFiles(path.join(ROOT, d)));
    const withEnrolmentQueries = files.filter((f) => /\blmsEnrollment\s*\.\s*(findMany|count)\s*\(/.test(readFileSync(f, 'utf8')));
    expect(withEnrolmentQueries.length).toBeGreaterThan(20);
  });

  it('no source file restates the enrolment status list', () => {
    const found = scanTree();
    const unexpected = Object.fromEntries(Object.entries(found).filter(([f]) => !(f in ALLOWED)));
    expect(unexpected).toEqual({});
  });

  it('every allow-list entry still has a finding (no stale entries)', () => {
    const found = scanTree();
    const stale = Object.keys(ALLOWED).filter((f) => !(f in found));
    expect(stale).toEqual([]);
  });
});
