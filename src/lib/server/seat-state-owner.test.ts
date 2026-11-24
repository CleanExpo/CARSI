import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * GP-759, Phill's ruling 23/11/2026 ("Fix the design once"): only the seat step
 * (`src/lib/server/seat-state.ts`) writes session and team seat state. The race tests prove the
 * step is serialisable; this test proves nothing writes those rows around it. A new writer must
 * call into the step instead of adding a second owner.
 */

const ROOT = join(__dirname, '..', '..', '..');
const OWNER = join('src', 'lib', 'server', 'seat-state.ts');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'generated' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const FILES = [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'src'))].map((f) => ({
  path: relative(ROOT, f),
  text: readFileSync(f, 'utf8'),
}));

/** Files outside the owner whose text matches. */
function writersOutsideOwner(pattern: RegExp, allowed: string[] = []): string[] {
  return FILES.filter((f) => f.path !== OWNER && !allowed.includes(f.path) && pattern.test(f.text)).map((f) => f.path);
}

describe('GP-759: the seat step is the only writer of seat and session state', () => {
  it('control: the scan sees the source tree and the owner', () => {
    expect(FILES.length).toBeGreaterThan(100);
    const owner = FILES.find((f) => f.path === OWNER);
    expect(owner?.text).toMatch(/lmsTeamCoursePurchase\.create\(/);
    expect(owner?.text).toMatch(/recordCheckoutPaymentReversed\(tx,/);
  });

  it('only the step writes a team seat block', () => {
    expect(
      writersOutsideOwner(/lmsTeamCoursePurchase\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/),
    ).toEqual([]);
    expect(writersOutsideOwner(/(INSERT INTO|UPDATE|DELETE FROM)\s+lms_team_course_purchases/i)).toEqual([]);
  });

  it('only the step writes a payment reversal marker', () => {
    const ledger = join('src', 'lib', 'server', 'payment-integrity-ledger.ts');
    // The ledger stores the marker; only the step calls its writers.
    expect(writersOutsideOwner(/payment-reversed:/, [ledger])).toEqual([]);
    expect(writersOutsideOwner(/\b(recordCheckoutPaymentReversed|clearDisputedCheckoutReversal)\(/, [ledger])).toEqual([]);
  });

  it('GP-641: only the step writes what decides a subscription\'s access', () => {
    const ledger = join('src', 'lib', 'server', 'payment-integrity-ledger.ts');
    expect(writersOutsideOwner(/subscription-ended:|subscription-paid:/, [ledger])).toEqual([]);
    expect(
      writersOutsideOwner(
        /\b(recordSubscriptionEnded|recordSubscriptionPaymentReversed|clearSubscriptionDisputedReversal|recordSubscriptionInvoicePaid|closeUnfulfilledPayment)\(/,
        [ledger],
      ),
    ).toEqual([]);
  });

  it('only the step calls the session revocation writers', () => {
    const revocation = join('src', 'lib', 'server', 'stripe-revocation.ts');
    expect(
      writersOutsideOwner(
        /\b(revokeEnrollmentsByPaymentReference|reactivateDisputeWonEnrollmentsByPaymentReference)\(/,
        [revocation],
      ),
    ).toEqual([]);
  });

  it('GP-764: only the step writes the checkout payment record', () => {
    expect(FILES.find((f) => f.path === OWNER)?.text).toMatch(/lmsCheckoutPayment\.create\(/);
    expect(
      writersOutsideOwner(
        /lmsCheckoutPayment\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/
      )
    ).toEqual([]);
    expect(
      writersOutsideOwner(/(INSERT INTO|UPDATE|DELETE FROM)\s+"?lms_checkout_payments/i)
    ).toEqual([]);
  });

  it('only the step issues a prepared enrolment (checkout and team seats)', () => {
    const service = join('src', 'lib', 'server', 'enrollment-service.ts');
    expect(writersOutsideOwner(/\bissuePreparedEnrolment\(/, [service])).toEqual([]);
  });

  it('every read and write in the step uses its transaction, never the global client', () => {
    const owner = FILES.find((f) => f.path === OWNER)!.text;
    expect(owner).not.toMatch(/from '@\/lib\/prisma'/);
    // The revocation writers default to the global client; the step must pass its transaction.
    for (const fn of ['revokeEnrollmentsByPaymentReference', 'reactivateDisputeWonEnrollmentsByPaymentReference']) {
      const calls = [...owner.matchAll(new RegExp(`\\b${fn}\\(([^)]*)\\)`, 'g'))].map((m) => m[1]);
      expect(calls.length).toBeGreaterThan(0);
      for (const args of calls) expect(args.trim().endsWith('tx')).toBe(true);
    }
  });

  it('GP-641: every subscription row write reads the reversal marker on its own transaction', () => {
    const TABLES = '(lmsSubscription|lmsTeamSubscription|lmsOrgSubscription|carsiCoachingMonthlySubscription)';
    const WRITE = '(create|createMany|upsert|update|updateMany)';
    const store = (f: string) => join('src', 'lib', 'server', f);
    const STORES = [
      store('subscription-store.ts'),
      store('team-subscription-store.ts'),
      store('org-subscription-store.ts'),
      store('carsi-coaching-subscription-store.ts'),
    ];
    // Writes on the global client that never set a Stripe-derived status: checkout reservations
    // (`checkout_pending`, no subscription id), the optimistic seat-limit bump after expand-seats,
    // and the coaching portal workspace text. Counted, so a new global write fails here.
    const GLOBAL_WRITES_ALLOWED: Record<string, number> = {
      [store('membership-checkout-reservation.ts')]: 6,
      [join('app', 'api', 'lms', 'subscription', 'teams', 'expand-seats', 'route.ts')]: 1,
      [store('carsi-coaching-subscription-store.ts')]: 1,
    };
    // Any receiver: `prisma.`, `db.`, `client.`, ... are writes outside the guard; only `tx.`
    // (the guard's transaction) is not.
    // A receiver that is an expression (`(db as X).`, `clients[0].`) is never the guard's `tx`.
    const anyWrite = new RegExp(`(?:\\b(\\w+)|[)\\]])\\??\\.${TABLES}\\.${WRITE}\\(`, 'g');
    const rawWrite = /(INSERT INTO|UPDATE|DELETE FROM)\s+"?(lms_subscriptions|lms_team_subscriptions|lms_org_subscriptions|carsi_coaching_monthly_subscriptions)\b/i;
    // In a store, the only way to a transaction is the guard.
    const ownTransaction = /\b(runSerializable|runSeatStateStep)\(|\$transaction\(/;

    const violations = (files: { path: string; text: string }[]) => {
      const out: string[] = [];
      for (const f of files) {
        const writes = [...f.text.matchAll(anyWrite)].map((m) => m[1]);
        const globals = writes.filter((r) => r !== 'tx').length;
        const txWrites = writes.length - globals;
        if (globals !== (GLOBAL_WRITES_ALLOWED[f.path] ?? 0)) out.push(`${f.path}: ${globals} writes outside a transaction`);
        if (txWrites > 0 && f.path !== OWNER && !STORES.includes(f.path)) out.push(`${f.path}: transaction write outside a store`);
        if (txWrites > 0 && STORES.includes(f.path)) {
          if (!/\brunGuardedSubscriptionWrite\(/.test(f.text)) out.push(`${f.path}: store write without runGuardedSubscriptionWrite`);
          if (ownTransaction.test(f.text)) out.push(`${f.path}: store opens its own transaction`);
        }
        if (rawWrite.test(f.text)) out.push(`${f.path}: raw SQL write`);
      }
      return out;
    };

    // Control: the scan catches each planted bypass.
    expect(violations([{ path: store('subscription-store.ts'), text: 'await tx.lmsSubscription.upsert({})' }])).toHaveLength(1);
    expect(violations([{ path: store('new-writer.ts'), text: 'await prisma.lmsTeamSubscription.update({})' }])).toHaveLength(1);
    expect(violations([{ path: store('new-writer.ts'), text: 'await db.lmsSubscription.update({})' }])).toHaveLength(1);
    expect(violations([{ path: store('new-writer.ts'), text: 'await (db as X).lmsSubscription.update({})' }])).toHaveLength(1);
    expect(
      violations([
        {
          path: store('team-subscription-store.ts'),
          text: 'runGuardedSubscriptionWrite(a); runSerializable((tx) => tx.lmsTeamSubscription.upsert({}))',
        },
      ]),
    ).toHaveLength(1);
    for (const s of STORES) expect(FILES.some((f) => f.path === s)).toBe(true);

    expect(violations(FILES)).toEqual([]);
  });

  it('the shared enrolment writer refuses checkout and team seat references outside the step', async () => {
    const { isSeatStatePaymentReference } = await import('./enrollment-service');
    expect(isSeatStatePaymentReference('cs_test_x')).toBe(true);
    expect(isSeatStatePaymentReference('team:team-1')).toBe(true);
    // Other references keep using the shared writer.
    expect(isSeatStatePaymentReference('team-seat:team-1')).toBe(false);
    expect(isSeatStatePaymentReference('free')).toBe(false);
    expect(isSeatStatePaymentReference('org:team-1')).toBe(false);
  });
});
