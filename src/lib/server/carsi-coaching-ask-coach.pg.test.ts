/**
 * GP-630 "Ask my coach" on a REAL PostgreSQL (CI's E2E job, `npm run test:pg`).
 *
 * Runs the production Prisma store and proves:
 *   - an escalated question lands on the asking member's action board, tagged for the coach;
 *   - a member's list never includes another member's question;
 *   - the coach inbox only holds that coach's open questions;
 *   - the conditional update lets only the first answer land;
 *   - the member can add a note to the question but cannot edit it or close it themselves.
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
  describe('ask my coach (real PostgreSQL)', () => {
    if (IN_CI) {
      it('must run in CI: needs DATABASE_URL pointing at the local migrated postgres service', () => {
        throw new Error(`CI=true but no usable local DATABASE_URL (host: "${HOST || 'none'}").`);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('ask my coach (real PostgreSQL)', async () => {
  const { prisma } = await import('@/lib/prisma');
  const { prismaAskCoachStore: store } =
    await import('@/lib/server/carsi-coaching-ask-coach-store');
  const rules = await import('@/lib/server/carsi-coaching-ask-coach');
  const actions = await import('@/lib/server/carsi-coaching-actions-store');
  const { getCoachKnowledgeBase } = await import('@/lib/coaching-portal/coach-knowledge-base');
  const { DEFAULT_COACHING_COACH } = await import('@/lib/coaching-portal/coach-routing');

  const memberId = randomUUID();
  const otherId = randomUUID();
  const COACH = DEFAULT_COACHING_COACH.id;

  beforeAll(async () => {
    await prisma.lmsUser.createMany({
      data: [memberId, otherId].map((id) => ({
        id,
        email: `gp630-${id}@example.test`,
        hashedPassword: 'provisional:x',
      })),
    });
  });

  afterAll(async () => {
    await prisma.lmsUser.deleteMany({ where: { id: { in: [memberId, otherId] } } });
    await prisma.$disconnect();
  });

  it('answers a covered question without writing anything', async () => {
    const r = await rules.askMyCoach(
      store,
      getCoachKnowledgeBase,
      memberId,
      'How do I stop undercharging when quoting jobs?'
    );
    expect(r.status).toBe('answered');
    expect(await prisma.carsiCoachingAction.count({ where: { userId: memberId } })).toBe(0);
  });

  it('routes an uncovered question to the coach on the member board, isolated per member', async () => {
    const mine = await rules.askMyCoach(
      store,
      getCoachKnowledgeBase,
      memberId,
      'Should I lease or buy my next van?'
    );
    const theirs = await rules.askMyCoach(
      store,
      getCoachKnowledgeBase,
      otherId,
      'What should I name my second brand?'
    );
    expect(mine.status).toBe('sent_to_coach');
    expect(theirs.status).toBe('sent_to_coach');

    const row = await prisma.carsiCoachingAction.findFirstOrThrow({ where: { userId: memberId } });
    expect(row).toMatchObject({
      assignedTo: 'coach',
      goalId: `ask-coach:${COACH}`,
      status: 'todo',
      coachFeedback: null,
    });

    const list = await rules.listMyCoachQuestions(store, memberId);
    expect(list.map((q) => q.question)).toEqual(['Should I lease or buy my next van?']);

    const inbox = await rules.listCoachInbox(store, COACH);
    const ours = inbox.filter((q) => [memberId, otherId].some((id) => q.memberLabel.includes(id)));
    expect(ours).toHaveLength(2);
    expect(await rules.listCoachInbox(store, 'coach-nobody')).toEqual([]);
  });

  it('member can note but not edit or close the question', async () => {
    const row = await prisma.carsiCoachingAction.findFirstOrThrow({ where: { userId: memberId } });
    await actions.upsertCoachingActionForUser(memberId, {
      id: row.id,
      title: 'Edited by member',
      status: 'done',
      progressNote: 'Leaning towards leasing.',
    });
    const after = await prisma.carsiCoachingAction.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.title).toBe('Should I lease or buy my next van?');
    expect(after.status).toBe('todo');
    expect(after.progressNote).toBe('Leaning towards leasing.');
  });

  it('member cannot delete the question (Codex r1 P1)', async () => {
    const row = await prisma.carsiCoachingAction.findFirstOrThrow({ where: { userId: memberId } });
    expect(await actions.deleteCoachingActionForUser(memberId, row.id)).toBe(false);
    expect(await prisma.carsiCoachingAction.count({ where: { id: row.id } })).toBe(1);
  });

  it('only the first coach answer lands, and the member sees it', async () => {
    const row = await prisma.carsiCoachingAction.findFirstOrThrow({ where: { userId: memberId } });
    const [a, b] = await Promise.all([
      rules.answerCoachQuestion(store, COACH, row.id, 'Lease it for the first two years.'),
      rules.answerCoachQuestion(store, COACH, row.id, 'Buy it outright.'),
    ]);
    expect([a, b].sort()).toEqual(['already_answered', 'answered']);
    expect(await rules.answerCoachQuestion(store, 'coach-nobody', row.id, 'x')).toBe('not_found');

    const after = await prisma.carsiCoachingAction.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.status).toBe('done');
    const [mine] = await rules.listMyCoachQuestions(store, memberId);
    expect(mine.status).toBe('answered');
    expect(mine.coachAnswer).toBe(after.coachFeedback);
  });
});
