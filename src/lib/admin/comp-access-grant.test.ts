/**
 * Regression tests for the complimentary-access grant decisions
 * (`scripts/grant-toby-comp-access.ts` via `comp-access-grant.ts`).
 *
 * Each `REGRESSION` block below pins a defect that actually shipped in the original script
 * and was caught in review on PR #692, not a hypothetical. The predicate itself
 * (`isEnrolmentAccessAllowed`) is covered by `enrollment-access.test.ts` and is not re-tested
 * here — what is tested is that this grant reuses it instead of restating it.
 */
import { describe, expect, it } from 'vitest';

import {
  accountActionFor,
  enrolmentsWithoutAccess,
  grantExitCode,
  isGrantComplete,
} from '@/lib/admin/comp-access-grant';

const row = (slug: string, status: string | null | undefined, revokedReason?: string | null) => ({
  status,
  revokedReason: revokedReason ?? null,
  course: { slug },
});

describe('accountActionFor', () => {
  it('creates an account when the learner has no row', () => {
    expect(accountActionFor(null)).toBe('create');
    expect(accountActionFor(undefined)).toBe('create');
  });

  it('leaves an already-active account alone', () => {
    expect(accountActionFor({ isActive: true })).toBe('reuse');
  });

  // REGRESSION (Bugbot, PR #692): the original script never set `isActive` on an existing
  // account. `authenticateWithPassword` / `sessionClaimsForUserId` both reject inactive
  // users, so the grant created enrolments the learner could never reach — it reported
  // complete while sign-in failed.
  it('reactivates a deactivated account rather than leaving it locked out', () => {
    expect(accountActionFor({ isActive: false })).toBe('reactivate');
  });
});

describe('enrolmentsWithoutAccess', () => {
  it('does not flag rows that grant access', () => {
    const rows = [row('a', 'active'), row('b', 'completed')];
    expect(enrolmentsWithoutAccess(rows)).toEqual([]);
  });

  it('flags every no-access status, so a revoked row is never reported as usable', () => {
    const rows = [
      row('revoked', 'revoked', 'refunded'),
      row('refunded', 'refunded'),
      row('disputed', 'disputed'),
      row('cancelled', 'cancelled'),
      row('canceled', 'canceled'),
      row('chargeback', 'chargeback'),
    ];
    expect(enrolmentsWithoutAccess(rows).map((r) => r.course.slug)).toEqual([
      'revoked',
      'refunded',
      'disputed',
      'cancelled',
      'canceled',
      'chargeback',
    ]);
  });

  // REGRESSION (Bugbot, PR #692): the report filtered `status: { not: 'active' }`, but the
  // WS3 allow-set is {active, completed}. Re-running after the learner finished a course
  // claimed they were locked out of content and certificates they could still reach.
  it('does not flag a COMPLETED enrolment as having no access', () => {
    expect(enrolmentsWithoutAccess([row('done', 'completed')])).toEqual([]);
  });

  // `status` is free text, so these rows are reachable. A `notIn: ['active','completed']`
  // query would flag all three — which is why the predicate is reused, not restated.
  it('normalises case and whitespace the free-text status column permits', () => {
    const rows = [row('a', 'COMPLETED'), row('b', ' active '), row('c', 'Active')];
    expect(enrolmentsWithoutAccess(rows)).toEqual([]);
  });

  // Fails closed: the predicate allow-lists, so anything unrecognised is treated as no-access.
  it('flags null, empty and unknown statuses rather than assuming access', () => {
    const rows = [row('a', null), row('b', undefined), row('c', ''), row('d', 'weird-new-status')];
    expect(enrolmentsWithoutAccess(rows).map((r) => r.course.slug)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('preserves the row so the caller can report status and revokedReason', () => {
    const [flagged] = enrolmentsWithoutAccess([row('x', 'revoked', 'disputed')]);
    expect(flagged).toMatchObject({
      status: 'revoked',
      revokedReason: 'disputed',
      course: { slug: 'x' },
    });
  });
});

describe('isGrantComplete / grantExitCode', () => {
  it('is complete when every course enrolled', () => {
    const outcome = { created: 25, alreadyEnrolled: 0, failed: 0 };
    expect(isGrantComplete(outcome)).toBe(true);
    expect(grantExitCode(outcome)).toBe(0);
  });

  it('is complete on a re-run where every course was already enrolled', () => {
    const outcome = { created: 0, alreadyEnrolled: 25, failed: 0 };
    expect(isGrantComplete(outcome)).toBe(true);
    expect(grantExitCode(outcome)).toBe(0);
  });

  // REGRESSION (CodeRabbit, PR #692): the original rule was
  // `failed && created === 0 && already === 0` — non-zero ONLY when every course failed.
  // Every partial outcome below exited 0, so a run that left the learner short of a course
  // reported success to any operator or wrapper reading the status code.
  it.each([
    ['24 enrolled, 1 failed', { created: 24, alreadyEnrolled: 0, failed: 1 }],
    ['1 enrolled, 24 failed', { created: 1, alreadyEnrolled: 0, failed: 24 }],
    ['re-run: 24 already enrolled, 1 failed', { created: 0, alreadyEnrolled: 24, failed: 1 }],
    ['mixed: some new, some existing, 1 failed', { created: 12, alreadyEnrolled: 12, failed: 1 }],
  ])('reports partial failure as incomplete — %s', (_label, outcome) => {
    expect(isGrantComplete(outcome)).toBe(false);
    expect(grantExitCode(outcome)).toBe(1);
  });

  it('reports total failure as incomplete', () => {
    const outcome = { created: 0, alreadyEnrolled: 0, failed: 25 };
    expect(isGrantComplete(outcome)).toBe(false);
    expect(grantExitCode(outcome)).toBe(1);
  });

  it('depends only on the failure count, never on how many succeeded', () => {
    for (const [created, alreadyEnrolled] of [
      [0, 0],
      [50, 0],
      [0, 50],
      [25, 25],
    ]) {
      expect(grantExitCode({ created, alreadyEnrolled, failed: 1 })).toBe(1);
      expect(grantExitCode({ created, alreadyEnrolled, failed: 0 })).toBe(0);
    }
  });
});
