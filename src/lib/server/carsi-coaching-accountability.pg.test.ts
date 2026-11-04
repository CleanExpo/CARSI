/**
 * GP-635 accountability on a REAL PostgreSQL (CI's E2E job, `npm run test:pg`).
 *
 * Runs the production Prisma store and proves, with no new table or column:
 *   - KPIs and a check-in land on the member's own growth plan and survive a re-read;
 *   - the plan's existing goals array is kept when accountability is added;
 *   - a stale compare-and-set write is refused, so concurrent writers cannot overwrite;
 *   - another member's plan is never touched;
 *   - the coach view only lists members whose plan names that coach;
 *   - a dry scheduled run writes nothing.
 * Cleans up after itself. Locally it is skipped without a local DATABASE_URL; in CI it must run.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const IN_CI = process.env.CI === 'true';
const HOST = (() => {
  try {
    return DB_URL ? new URL(DB_URL).hostname : '';
  } catch {
    return '';
  }
})();
const RUNNABLE = Boolean(DB_URL) && ['localhost', '127.0.0.1', '::1'].includes(HOST);

if (!RUNNABLE) {
  describe('coaching accountability (real PostgreSQL)', () => {
    if (IN_CI) {
      it('must run in CI: needs DATABASE_URL pointing at the local migrated postgres service', () => {
        throw new Error(`CI=true but no usable local DATABASE_URL (host: "${HOST || 'none'}").`);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('coaching accountability (real PostgreSQL)', async () => {
  const { prisma } = await import('@/lib/prisma');
  const { prismaAccountabilityStore: store } =
    await import('@/lib/server/carsi-coaching-accountability-store');
  const rules = await import('@/lib/server/carsi-coaching-accountability');
  const { DEFAULT_COACHING_COACH } = await import('@/lib/coaching-portal/coach-routing');

  const memberId = randomUUID();
  const otherId = randomUUID();
  const strangerId = randomUUID();
  const ids = [memberId, otherId, strangerId];
  const T0 = new Date('2026-11-01T23:00:00.000Z');
  const DAY = 86_400_000;
  const LEGACY_GOALS = JSON.stringify([{ id: 'g1', title: 'One more direct job a week' }]);

  beforeAll(async () => {
    await prisma.lmsUser.createMany({
      data: ids.map((id) => ({
        id,
        email: `gp635-${id}@example.test`,
        hashedPassword: 'provisional:x',
        fullName: 'Demo Member',
      })),
    });
    await prisma.carsiCoachingGrowthPlan.create({
      data: { userId: memberId, status: 'approved', goalsJson: LEGACY_GOALS },
    });
    await prisma.carsiCoachingGrowthPlan.create({
      data: { userId: otherId, status: 'approved', goalsJson: LEGACY_GOALS },
    });
    const periodEnd = new Date(Date.now() + 30 * DAY);
    await prisma.carsiCoachingMonthlySubscription.createMany({
      data: ids.map((userId, i) => ({
        userId,
        stripeSubscriptionId: `sub_gp635_${i}_${userId.slice(0, 8)}`,
        status: 'active',
        currentPeriodEnd: periodEnd,
      })),
    });
  });

  afterAll(async () => {
    await prisma.carsiCoachingMonthlySubscription.deleteMany({ where: { userId: { in: ids } } });
    await prisma.carsiCoachingGrowthPlan.deleteMany({ where: { userId: { in: ids } } });
    await prisma.lmsUser.deleteMany({ where: { id: { in: ids } } });
  });

  it('saves KPIs and a check-in on the member’s own plan, keeping existing goals', async () => {
    const saved = await rules.saveMyKpis(
      store,
      memberId,
      [{ label: 'Quotes sent' }, { label: 'Jobs won' }, { label: 'Google reviews' }],
      T0
    );
    expect(saved.status).toBe('ok');
    if (saved.status !== 'ok') return;
    const values = Object.fromEntries(saved.view.kpis.map((k, i) => [k.id, i + 2]));
    const checked = await rules.submitMyCheckIn(
      store,
      memberId,
      values,
      new Date(T0.getTime() + DAY)
    );
    expect(checked.status).toBe('ok');

    const plan = await store.readPlan(memberId);
    expect(plan?.goals).toEqual(JSON.parse(LEGACY_GOALS));
    expect(plan?.accountability?.checkIns[0]?.values).toEqual(values);
    expect(plan?.accountability?.coachId).toBe(DEFAULT_COACHING_COACH.id);

    const row = await prisma.carsiCoachingGrowthPlan.findUnique({ where: { userId: memberId } });
    expect(row?.status).toBe('approved');
    // The other member's plan is untouched, byte for byte.
    const other = await prisma.carsiCoachingGrowthPlan.findUnique({ where: { userId: otherId } });
    expect(other?.goalsJson).toBe(LEGACY_GOALS);
  });

  it('refuses a stale compare-and-set write', async () => {
    const plan = await store.readPlan(memberId);
    expect(plan?.accountability).toBeTruthy();
    const acc = plan!.accountability!;
    expect(
      await store.writeAccountability(
        memberId,
        { ...acc, lastSeenAt: T0.toISOString() },
        plan!.goals,
        plan!.version
      )
    ).toBe(true);
    // Same (now stale) version again: refused.
    expect(
      await store.writeAccountability(
        memberId,
        { ...acc, lastSeenAt: null },
        plan!.goals,
        plan!.version
      )
    ).toBe(false);
    // Creating a plan where one already exists is refused too.
    expect(await store.writeAccountability(memberId, acc, [], null)).toBe(false);
  });

  it('creates a draft plan for a member without one', async () => {
    const saved = await rules.saveMyKpis(
      store,
      strangerId,
      [{ label: 'Calls made' }, { label: 'Quotes sent' }, { label: 'Jobs won' }],
      T0
    );
    expect(saved.status).toBe('ok');
    const row = await prisma.carsiCoachingGrowthPlan.findUnique({ where: { userId: strangerId } });
    expect(row?.status).toBe('draft');
  });

  it('the coach view lists only members whose plan names that coach', async () => {
    const plan = await store.readPlan(strangerId);
    await store.writeAccountability(
      strangerId,
      { ...plan!.accountability!, coachId: 'coach-someone-else' },
      plan!.goals,
      plan!.version
    );
    const view = await rules.getCoachAccountabilityView(
      store,
      DEFAULT_COACHING_COACH.id,
      new Date(T0.getTime() + 21 * DAY)
    );
    const listed = view.members.map((m) => m.userId);
    expect(listed).toContain(memberId);
    expect(listed).not.toContain(strangerId);
    expect(listed).not.toContain(otherId);
  });

  it('a dry scheduled run writes nothing', async () => {
    const before = await prisma.carsiCoachingGrowthPlan.findUnique({ where: { userId: memberId } });
    const result = await rules.runAccountabilitySchedule(
      store,
      new Date(T0.getTime() + 30 * DAY),
      null
    );
    expect(result.dryRun).toBe(true);
    expect(result.coachAlerts.some((a) => a.userId === memberId && a.kind === 'silent')).toBe(true);
    const after = await prisma.carsiCoachingGrowthPlan.findUnique({ where: { userId: memberId } });
    expect(after?.goalsJson).toBe(before?.goalsJson);
  });
});
