/**
 * GP-629 AI monthly review on a REAL PostgreSQL (CI's E2E job, `npm run test:pg`).
 *
 * Runs the production Prisma store with the model mocked out (no network) and proves, for the
 * "Done when" demo member (5 actions: 2 done, 1 blocked, 2 todo, plus a prep note):
 *   - generate writes a review record and 3–7 draft actions, with assigned_to only customer|coach;
 *   - the member's board read and guidance are unchanged until approval;
 *   - the member cannot edit or delete a draft row through the member store;
 *   - approve-all publishes the drafts as todo and sets latest_guidance; another member is untouched.
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
  describe('coaching monthly review (real PostgreSQL)', () => {
    if (IN_CI) {
      it('must run in CI: needs DATABASE_URL pointing at the local migrated postgres service', () => {
        throw new Error(`CI=true but no usable local DATABASE_URL (host: "${HOST || 'none'}").`);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('coaching monthly review (real PostgreSQL)', async () => {
  const { prisma } = await import('@/lib/prisma');
  const mr = await import('@/lib/server/carsi-coaching-monthly-review');
  const store = await import('@/lib/server/carsi-coaching-actions-store');

  const memberId = randomUUID();
  const otherId = randomUUID();
  const now = new Date();
  const sessionAt = new Date(now.getTime() + 6 * 24 * 3600 * 1000);

  const modelReply = async () => ({
    model: 'mock/model',
    text: JSON.stringify({
      summary: 'Quotes are converting; hiring is the open question.',
      guidance: 'Hold the 48-hour call rule. Set a crew lead pay range before you advertise.',
      actions: [
        { title: 'Set a crew lead pay range', goalId: 'g2', priority: 'high', dueInDays: 10 },
        { title: 'Plan December cash flow', goalId: 'g1', priority: 'high', dueInDays: 7 },
        { title: 'Book the two insurer calls', goalId: 'g1', priority: 'medium', dueInDays: 14 },
      ],
    }),
  });

  beforeAll(async () => {
    await prisma.lmsUser.createMany({
      data: [memberId, otherId].map((id) => ({
        id,
        email: `gp629-${id}@example.test`,
        hashedPassword: 'provisional:x',
      })),
    });
    for (const userId of [memberId, otherId]) {
      await prisma.carsiCoachingMonthlySubscription.create({ data: { userId, status: 'active' } });
      await prisma.carsiCoachingGrowthPlan.create({
        data: {
          userId,
          status: 'approved',
          focusTitle: 'Turn retail quotes into bookings',
          goalsJson: JSON.stringify([
            { id: 'g1', title: 'One more direct job booked per week' },
            { id: 'g2', title: 'Crew lead trained and running jobs' },
          ]),
          latestGuidance: 'Keep the 48-hour call rule going.',
        },
      });
      await prisma.carsiCoachingSession.create({
        data: {
          userId,
          scheduledAt: sessionAt,
          prepResponsesJson: JSON.stringify({ discuss: 'Crew lead pay rates' }),
        },
      });
    }
    const actions: [string, string, string | null, string | null][] = [
      ['Call every retail quote within 48 hours', 'done', 'g1', null],
      ['Block Friday morning for quoting', 'done', 'g1', null],
      ['Write the crew lead job description', 'blocked', 'g2', 'Not sure what to pay a crew lead.'],
      ['Ask two insurers about panel work', 'todo', 'g1', null],
      ['Price a second van', 'todo', null, null],
    ];
    await prisma.carsiCoachingAction.createMany({
      data: [
        ...actions.map(([title, status, goalId, progressNote], i) => ({
          userId: memberId,
          title,
          status,
          goalId,
          progressNote,
          sortOrder: i,
        })),
        { userId: otherId, title: 'Other member action', status: 'todo', sortOrder: 0 },
      ],
    });
    await prisma.carsiCoachingBusinessProfile.create({
      data: { userId: memberId, sessionPrepNotes: 'I want to talk about hiring.' },
    });
  });

  afterAll(async () => {
    await prisma.lmsUser.deleteMany({ where: { id: { in: [memberId, otherId] } } });
  });

  it('drafts stay hidden from the member until the coach approves, then publish as todo', async () => {
    const boardBefore = (await store.listCoachingActionsForUser(memberId)).map((a) => a.id);
    expect(boardBefore).toHaveLength(5);

    const view = await mr.generateMonthlyReview(memberId, { now, draftWithModel: modelReply });
    expect(view.status).toBe('draft');
    expect(view.review?.counts).toEqual({ total: 5, done: 2, blocked: 1, open: 2 });
    expect(view.actions.length).toBeGreaterThanOrEqual(3);
    expect(view.actions.length).toBeLessThanOrEqual(7);

    const assigned = await prisma.carsiCoachingAction.findMany({
      where: { userId: memberId },
      select: { assignedTo: true },
    });
    for (const a of assigned) expect(['customer', 'coach']).toContain(a.assignedTo);

    // Member sees nothing new.
    expect((await store.listCoachingActionsForUser(memberId)).map((a) => a.id)).toEqual(
      boardBefore
    );
    const plan = await prisma.carsiCoachingGrowthPlan.findUnique({ where: { userId: memberId } });
    expect(plan?.latestGuidance).toBe('Keep the 48-hour call rule going.');

    // Member cannot edit or delete a draft row.
    const draft = await prisma.carsiCoachingAction.findFirst({
      where: { userId: memberId, status: 'draft', NOT: { goalId: { startsWith: 'review:' } } },
    });
    expect(draft).not.toBeNull();
    expect(
      await store.upsertCoachingActionForUser(memberId, {
        id: draft!.id,
        title: 'x',
        status: 'todo',
      })
    ).toEqual({ ok: false });
    expect(await store.deleteCoachingActionForUser(memberId, draft!.id)).toBe(false);
    const still = await prisma.carsiCoachingAction.findUnique({ where: { id: draft!.id } });
    expect(still?.status).toBe('draft');
    expect(still?.title).toBe(draft!.title);

    // Approve all.
    const res = await mr.approveMonthlyReview(memberId, undefined);
    expect(res).toEqual({ status: 'approved', published: view.actions.length });
    const boardAfter = await store.listCoachingActionsForUser(memberId);
    expect(boardAfter).toHaveLength(5 + view.actions.length);
    expect(
      boardAfter.filter((a) => !boardBefore.includes(a.id)).every((a) => a.status === 'todo')
    ).toBe(true);
    const planAfter = await prisma.carsiCoachingGrowthPlan.findUnique({
      where: { userId: memberId },
    });
    expect(planAfter?.latestGuidance).toBe(view.guidance);
    expect(
      await prisma.carsiCoachingAction.count({ where: { userId: memberId, status: 'draft' } })
    ).toBe(0);

    // The other member is untouched.
    const other = await prisma.carsiCoachingAction.findMany({ where: { userId: otherId } });
    expect(other.map((a) => a.title)).toEqual(['Other member action']);
    const otherPlan = await prisma.carsiCoachingGrowthPlan.findUnique({
      where: { userId: otherId },
    });
    expect(otherPlan?.latestGuidance).toBe('Keep the 48-hour call rule going.');
  });
});
