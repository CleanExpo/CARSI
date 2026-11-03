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
  describe('partner demo seed (real PostgreSQL)', () => {
    if (IN_CI) {
      it('must run in CI: needs DATABASE_URL pointing at the local migrated postgres service', () => {
        throw new Error(`CI=true but no usable local DATABASE_URL (host: "${HOST || 'none'}").`);
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
