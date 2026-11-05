/**
 * GP-629: coach drafts (status 'draft') and review records must never reach the member through the
 * member action store. Real-Postgres coverage is in carsi-coaching-monthly-review.pg.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    carsiCoachingAction: {
      findMany: mock.findMany,
      findFirst: mock.findFirst,
      update: mock.update,
      create: mock.create,
      deleteMany: mock.deleteMany,
    },
  },
}));
vi.mock('@/lib/server/carsi-coaching-learning-path', () => ({
  syncLearningPath: vi.fn().mockResolvedValue([]),
  isLearningAction: (goalId: string | null) => Boolean(goalId?.startsWith('course:')),
}));

import { MARKETING_ACTION_GOAL_PREFIX } from '@/lib/coaching-portal/marketing-pack/proposed-actions';
import { MEMBER_BOARD_STATUSES } from '@/lib/coaching-portal/monthly-review';
import {
  deleteCoachingActionForUser,
  listCoachingActionsForUser,
  upsertCoachingActionForUser,
} from '@/lib/server/carsi-coaching-actions-store';

const USER = '11111111-1111-4111-8111-111111111111';
const DRAFT_ID = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
  for (const fn of Object.values(mock)) fn.mockReset();
  mock.findMany.mockResolvedValue([]);
  mock.deleteMany.mockResolvedValue({ count: 0 });
});

describe('member action store hides coach drafts (GP-629)', () => {
  it('reads an allowlist: board statuses, plus marketing-pack rows waiting on the coach', async () => {
    await listCoachingActionsForUser(USER);
    const where = mock.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe(USER);
    // No bare status filter: a new hidden status is absent from both branches, so it cannot leak.
    expect(where.status).toBeUndefined();
    expect(where.OR).toEqual([
      { status: { in: [...MEMBER_BOARD_STATUSES] } },
      {
        status: { in: ['proposed', 'declined'] },
        goalId: { startsWith: MARKETING_ACTION_GOAL_PREFIX },
      },
    ]);
    expect(MEMBER_BOARD_STATUSES).toEqual(['todo', 'in_progress', 'done', 'blocked']);
    expect(MARKETING_ACTION_GOAL_PREFIX).toBe('marketing-pack:');
  });

  it('refuses a member edit of a draft row: no update, no create with that id', async () => {
    mock.findFirst.mockResolvedValue({ id: DRAFT_ID, goalId: null, status: 'draft' });
    const res = await upsertCoachingActionForUser(USER, {
      id: DRAFT_ID,
      title: 'I found the hidden draft',
      status: 'todo',
    });
    expect(res).toEqual({ ok: false });
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.create).not.toHaveBeenCalled();
  });

  it('refuses a member edit of an approved review record', async () => {
    mock.findFirst.mockResolvedValue({
      id: DRAFT_ID,
      goalId: 'review:none',
      status: 'review_approved',
    });
    const res = await upsertCoachingActionForUser(USER, { id: DRAFT_ID, title: 'x' });
    expect(res).toEqual({ ok: false });
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.create).not.toHaveBeenCalled();
  });

  it('still lets a member edit their own board action', async () => {
    mock.findFirst.mockResolvedValue({ id: 'a1', goalId: null, status: 'todo' });
    const res = await upsertCoachingActionForUser(USER, {
      id: 'a1',
      title: 'Mine',
      status: 'done',
    });
    expect(res).toEqual({ ok: true });
    expect(mock.update).toHaveBeenCalledTimes(1);
  });

  it('member delete is limited to board statuses, so a draft cannot be deleted', async () => {
    await deleteCoachingActionForUser(USER, DRAFT_ID);
    const where = mock.deleteMany.mock.calls[0][0].where;
    expect(where.id).toBe(DRAFT_ID);
    expect(where.userId).toBe(USER);
    expect(where.status).toEqual({ in: [...MEMBER_BOARD_STATUSES] });
  });
});
