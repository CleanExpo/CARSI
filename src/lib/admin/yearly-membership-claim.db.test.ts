import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Covers the parts of the claim that TOUCH THE DATABASE.
 *
 * The pure window rule was already tested, and that is precisely why the
 * new-learner hole survived review: `isWithinRegrantWindow` is correct in
 * isolation, and the defect lived in which rows ever get stamped. These tests
 * exercise claim → grant → claim as a sequence, which is the only shape that
 * shows it.
 */
type Row = { id: string; email: string; yearlyMembershipGrantedAt: Date | null };

const state: { rows: Row[] } = { rows: [] };

function matches(row: Row, where: Record<string, unknown>): boolean {
  if (typeof where.id === 'string' && row.id !== where.id) return false;
  if (typeof where.email === 'string' && row.email !== where.email) return false;
  if (where.yearlyMembershipGrantedAt instanceof Date) {
    if (row.yearlyMembershipGrantedAt?.getTime() !== where.yearlyMembershipGrantedAt.getTime()) {
      return false;
    }
  }
  const or = where.OR as { yearlyMembershipGrantedAt: null | { lt: Date } }[] | undefined;
  if (or) {
    const ok = or.some((clause) => {
      if (clause.yearlyMembershipGrantedAt === null) return row.yearlyMembershipGrantedAt === null;
      const lt = clause.yearlyMembershipGrantedAt.lt;
      return row.yearlyMembershipGrantedAt !== null && row.yearlyMembershipGrantedAt < lt;
    });
    if (!ok) return false;
  }
  return true;
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) => {
        return state.rows.find((r) => r.email === where.email) ?? null;
      }),
      updateMany: vi.fn(
        async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
          const hits = state.rows.filter((r) => matches(r, where));
          for (const hit of hits) Object.assign(hit, data);
          return { count: hits.length };
        },
      ),
    },
  },
}));

const {
  claimYearlyMembershipGrant,
  recordYearlyMembershipGrant,
  releaseYearlyMembershipClaim,
  YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS,
} = await import('./yearly-membership-claim');

const T0 = new Date('2026-08-24T22:00:00.000Z');
const later = (ms: number) => new Date(T0.getTime() + ms);

beforeEach(() => {
  state.rows = [];
  vi.clearAllMocks();
});

describe('a learner with no account yet — the ordinary case for this form', () => {
  it('admits the first grant, then REFUSES the second once it is recorded', async () => {
    // The regression this file exists for. The claim cannot stamp a row that
    // does not exist, so without `recordYearlyMembershipGrant` the column stays
    // null and every later grant is admitted — leaving new members, who are most
    // of them, entirely unguarded.
    expect(await claimYearlyMembershipGrant('new@example.test', T0)).toEqual({ claimed: true });

    // The grant runs and creates the account.
    state.rows.push({ id: 'u1', email: 'new@example.test', yearlyMembershipGrantedAt: null });
    await recordYearlyMembershipGrant('new@example.test', T0);

    expect(state.rows[0].yearlyMembershipGrantedAt).toEqual(T0);

    const second = await claimYearlyMembershipGrant('new@example.test', later(30_000));
    expect(second.claimed).toBe(false);
  });

  it('admits again once the window has passed, because renewals are legitimate', async () => {
    state.rows.push({ id: 'u1', email: 'new@example.test', yearlyMembershipGrantedAt: null });
    await recordYearlyMembershipGrant('new@example.test', T0);

    const renewal = await claimYearlyMembershipGrant(
      'new@example.test',
      later(YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS + 1_000),
    );
    expect(renewal).toEqual({ claimed: true });
  });
});

describe('a learner who already has an account', () => {
  it('claims by conditional UPDATE, so the row is stamped before the grant runs', async () => {
    state.rows.push({ id: 'u1', email: 'member@example.test', yearlyMembershipGrantedAt: null });

    expect(await claimYearlyMembershipGrant('member@example.test', T0)).toEqual({ claimed: true });
    expect(state.rows[0].yearlyMembershipGrantedAt).toEqual(T0);
  });

  it('refuses a repeat inside the window', async () => {
    state.rows.push({ id: 'u1', email: 'member@example.test', yearlyMembershipGrantedAt: T0 });

    const second = await claimYearlyMembershipGrant('member@example.test', later(60_000));
    expect(second.claimed).toBe(false);
  });

  it('normalises the email, so casing cannot slip past the guard', async () => {
    state.rows.push({ id: 'u1', email: 'member@example.test', yearlyMembershipGrantedAt: T0 });

    const second = await claimYearlyMembershipGrant('  MEMBER@Example.TEST  ', later(60_000));
    expect(second.claimed).toBe(false);
  });
});

describe('releasing a claim when the grant did not happen', () => {
  it('clears only the exact timestamp it wrote', async () => {
    state.rows.push({ id: 'u1', email: 'member@example.test', yearlyMembershipGrantedAt: T0 });

    // A claim another request has since taken must survive.
    await releaseYearlyMembershipClaim('member@example.test', later(5_000));
    expect(state.rows[0].yearlyMembershipGrantedAt).toEqual(T0);

    await releaseYearlyMembershipClaim('member@example.test', T0);
    expect(state.rows[0].yearlyMembershipGrantedAt).toBeNull();
  });
});
