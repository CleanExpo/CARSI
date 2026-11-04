/**
 * GP-637 partner-demo seed on a REAL PostgreSQL (CI's E2E job, `npm run test:pg`).
 *
 * Runs the real Prisma client against the migrated local database and proves:
 *   - the seed writes every demo row the plan describes, and a second run changes nothing;
 *   - a real member's rows are untouched;
 *   - the real portal loader sees the demo member as an active subscriber with an approved plan,
 *     six actions and two sessions (i.e. the walkthrough screens have data);
 *   - the demo login is locked and guest checkout cannot claim it.
 * Cleans up after itself (deleting the demo user cascades to its coaching rows).
 *
 * Locally it is skipped without a local DATABASE_URL; in CI (CI=true) it must run.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

// Loopback host AND CARSI_PG_DISPOSABLE=1, or no run at all (src/test-utils/pg-disposable.ts).
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

if (!RUNNABLE) {
  describe('partner demo seed (real PostgreSQL)', () => {
    const refusal = TARGET.refusal;
    if (refusal) {
      it('refuses: needs a disposable loopback DATABASE_URL (CARSI_PG_DISPOSABLE=1)', () => {
        throw new Error(refusal);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('partner demo seed (real PostgreSQL)', async () => {
  const { prisma } = await import('@/lib/prisma');
  const seed = await import('@/lib/coaching-portal/partner-demo-seed');
  const { loadCoachingPortalDashboard } = await import('@/lib/server/carsi-coaching-portal-dashboard');
  const { authenticateWithPassword, isProvisionalPasswordHash } = await import('@/lib/server/lms-auth');

  const db = prisma as unknown as import('@/lib/coaching-portal/partner-demo-seed').PartnerDemoSeedDb;
  const realId = randomUUID();
  const realEmail = `gp637-real-${realId}@example.test`;

  const demoRowCounts = async () => ({
    users: await prisma.lmsUser.count({ where: { id: seed.PARTNER_DEMO_SEED_USER_ID } }),
    subs: await prisma.carsiCoachingMonthlySubscription.count({ where: { userId: seed.PARTNER_DEMO_SEED_USER_ID } }),
    profiles: await prisma.carsiCoachingBusinessProfile.count({ where: { userId: seed.PARTNER_DEMO_SEED_USER_ID } }),
    assessments: await prisma.carsiCoachingAssessment.count({ where: { userId: seed.PARTNER_DEMO_SEED_USER_ID } }),
    plans: await prisma.carsiCoachingGrowthPlan.count({ where: { userId: seed.PARTNER_DEMO_SEED_USER_ID } }),
    actions: await prisma.carsiCoachingAction.count({ where: { userId: seed.PARTNER_DEMO_SEED_USER_ID } }),
    sessions: await prisma.carsiCoachingSession.count({ where: { userId: seed.PARTNER_DEMO_SEED_USER_ID } }),
  });

  afterAll(async () => {
    await prisma.lmsUser.deleteMany({ where: { id: { in: [seed.PARTNER_DEMO_SEED_USER_ID, realId] } } });
    await prisma.$disconnect();
  });

  it('dry run writes nothing', async () => {
    await prisma.lmsUser.deleteMany({ where: { id: seed.PARTNER_DEMO_SEED_USER_ID } });
    const report = await seed.applyPartnerDemoSeed(db, seed.buildPartnerDemoSeedPlan(new Date()), {
      dryRun: true,
    });
    expect(report.operations.length).toBeGreaterThan(0);
    expect(await demoRowCounts()).toEqual({
      users: 0, subs: 0, profiles: 0, assessments: 0, plans: 0, actions: 0, sessions: 0,
    });
  });

  it('refuses, changing nothing, when a planned row id is owned by another member (review r1 P1)', async () => {
    const otherId = randomUUID();
    const plan = seed.buildPartnerDemoSeedPlan(new Date());
    const clashId = plan.actions[0].id;
    await prisma.lmsUser.create({
      data: { id: otherId, email: `gp637-other-${otherId}@example.test`, hashedPassword: 'provisional:x' },
    });
    try {
      await prisma.carsiCoachingAction.create({
        data: { id: clashId, userId: otherId, title: 'Real member action' },
      });
      for (const dryRun of [true, false]) {
        await expect(seed.applyPartnerDemoSeed(db, plan, { dryRun })).rejects.toThrow(
          /owned by another member/
        );
      }
      const row = await prisma.carsiCoachingAction.findUniqueOrThrow({ where: { id: clashId } });
      expect(row.title).toBe('Real member action');
      expect(row.userId).toBe(otherId);
      expect(await prisma.lmsUser.count({ where: { id: seed.PARTNER_DEMO_SEED_USER_ID } })).toBe(0);
    } finally {
      await prisma.lmsUser.delete({ where: { id: otherId } });
    }
  });

  it('a login that takes the demo id between the check and the write keeps its password and name (review r5 P1)', async () => {
    await prisma.lmsUser.deleteMany({ where: { id: seed.PARTNER_DEMO_SEED_USER_ID } });
    const claimantEmail = `gp637-claimant-${randomUUID()}@example.test`;
    const claimantHash = '$2a$12$' + 'r'.repeat(53);
    // Commit a foreign login at the demo id on a separate connection, just before the seed's
    // own login write inside its transaction (after every ownership check has run).
    const racing = {
      ...db,
      $transaction: (fn: (tx: unknown) => Promise<unknown>, opts?: unknown) =>
        (prisma.$transaction as unknown as (f: (tx: unknown) => Promise<unknown>, o?: unknown) => Promise<unknown>)(
          async (tx) => {
            const t = tx as { lmsUser: { upsert: (a: unknown) => Promise<unknown> } };
            const realUpsert = t.lmsUser.upsert.bind(t.lmsUser);
            const proxied = new Proxy(t, {
              get(target, key) {
                if (key !== 'lmsUser') return Reflect.get(target, key);
                return new Proxy(target.lmsUser, {
                  get(u, k) {
                    if (k !== 'upsert') return Reflect.get(u, k);
                    return async (a: unknown) => {
                      await prisma.lmsUser.create({
                        data: {
                          id: seed.PARTNER_DEMO_SEED_USER_ID,
                          email: claimantEmail,
                          hashedPassword: claimantHash,
                          fullName: 'Real Account',
                        },
                      });
                      return realUpsert(a);
                    };
                  },
                });
              },
            });
            return fn(proxied);
          },
          opts
        ),
    } as typeof db;
    try {
      await expect(
        seed.applyPartnerDemoSeed(racing, seed.buildPartnerDemoSeedPlan(new Date()), { dryRun: false })
      ).rejects.toThrow();
      const row = await prisma.lmsUser.findUniqueOrThrow({ where: { id: seed.PARTNER_DEMO_SEED_USER_ID } });
      expect(row.email).toBe(claimantEmail);
      expect(row.hashedPassword).toBe(claimantHash);
      expect(row.fullName).toBe('Real Account');
      expect(
        await prisma.carsiCoachingMonthlySubscription.count({ where: { userId: seed.PARTNER_DEMO_SEED_USER_ID } })
      ).toBe(0);
    } finally {
      await prisma.lmsUser.deleteMany({ where: { id: seed.PARTNER_DEMO_SEED_USER_ID } });
    }
  });

  it('seeds the demo member, is idempotent, and leaves a real member alone', async () => {
    await prisma.lmsUser.create({
      data: { id: realId, email: realEmail, hashedPassword: '$2a$12$notarealhashnotarealhashnotarealhashnotarealhashnotare' },
    });
    await prisma.carsiCoachingAction.create({ data: { userId: realId, title: 'Real member action' } });

    const now = new Date();
    const plan = seed.buildPartnerDemoSeedPlan(now);
    const first = await seed.applyPartnerDemoSeed(db, plan, { dryRun: false });
    expect(first.passwordState).toBe('locked-new');
    const counts = await demoRowCounts();
    expect(counts).toEqual({
      users: 1, subs: 1, profiles: 1, assessments: 1, plans: 1, actions: 6, sessions: 2,
    });

    const before = await prisma.carsiCoachingAction.findMany({
      where: { userId: seed.PARTNER_DEMO_SEED_USER_ID },
      orderBy: { id: 'asc' },
    });
    const userBefore = await prisma.lmsUser.findUniqueOrThrow({ where: { id: seed.PARTNER_DEMO_SEED_USER_ID } });
    const second = await seed.applyPartnerDemoSeed(db, plan, { dryRun: false });
    expect(second.passwordState).toBe('kept-locked');
    expect(await demoRowCounts()).toEqual(counts);
    const after = await prisma.carsiCoachingAction.findMany({
      where: { userId: seed.PARTNER_DEMO_SEED_USER_ID },
      orderBy: { id: 'asc' },
    });
    const strip = (rows: typeof before) => rows.map(({ updatedAt: _u, ...r }) => r);
    expect(strip(after)).toEqual(strip(before));
    const userAfter = await prisma.lmsUser.findUniqueOrThrow({ where: { id: seed.PARTNER_DEMO_SEED_USER_ID } });
    expect(userAfter.hashedPassword).toBe(userBefore.hashedPassword);

    expect(await prisma.carsiCoachingAction.count({ where: { userId: realId } })).toBe(1);
    const real = await prisma.lmsUser.findUniqueOrThrow({ where: { id: realId } });
    expect(real.email).toBe(realEmail);
  });

  it('the real portal loader shows the demo member as active with plan, actions and sessions', async () => {
    const dashboard = await loadCoachingPortalDashboard({
      sub: seed.PARTNER_DEMO_SEED_USER_ID,
      email: seed.PARTNER_DEMO_SEED_MEMBER_EMAIL,
      full_name: 'Jordan Demo',
      role: 'student',
    });
    expect(dashboard.access.mode).toBe('subscriber');
    expect(dashboard.homeState).toBe('active');
    expect(dashboard.profile.complete).toBe(true);
    expect(dashboard.onboardingSubmit.complete).toBe(true);
    expect(dashboard.assessment.status).toBe('reviewed');
    expect(dashboard.plan.hasApprovedPlan).toBe(true);
    expect(dashboard.plan.focusTitle).toBe('Turn retail quotes into bookings');
    expect(dashboard.actions.items).toHaveLength(6);
    expect(new Set(dashboard.actions.items.map((a) => a.status))).toEqual(
      new Set(['todo', 'in_progress', 'done', 'blocked'])
    );
    expect(dashboard.sessions.hasBookedAny).toBe(true);
    expect(dashboard.sessions.upcoming?.coachName).toBe(seed.PARTNER_DEMO_COACH_LABEL);
  });

  it('the demo login is locked and not claimable', async () => {
    const user = await prisma.lmsUser.findUniqueOrThrow({ where: { id: seed.PARTNER_DEMO_SEED_USER_ID } });
    expect(user.hashedPassword.startsWith(seed.PARTNER_DEMO_LOCKED_PASSWORD_PREFIX)).toBe(true);
    expect(isProvisionalPasswordHash(user.hashedPassword)).toBe(false);
    expect(await authenticateWithPassword(seed.PARTNER_DEMO_SEED_MEMBER_EMAIL, user.hashedPassword)).toBeNull();
  });
});
