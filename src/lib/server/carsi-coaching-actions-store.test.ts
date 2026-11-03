import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  priority: string | null;
  progressNote: string | null;
  coachFeedback: string | null;
  goalId: string | null;
  sortOrder: number;
  completedAt: Date | null;
  createdAt: Date;
};

const rows: Row[] = [];

function matches(row: Row, where: Record<string, unknown>) {
  return Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && 'in' in (v as object)) {
      return ((v as { in: unknown[] }).in ?? []).includes(row[k as keyof Row]);
    }
    return row[k as keyof Row] === v;
  });
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    carsiCoachingAction: {
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        rows.filter((r) => matches(r, where)),
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((r) => matches(r, where)) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Partial<Row>;
      }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
      create: async ({ data }: { data: Partial<Row> }) => {
        const row = {
          description: null,
          dueDate: null,
          priority: null,
          progressNote: null,
          coachFeedback: null,
          goalId: null,
          sortOrder: 0,
          completedAt: null,
          createdAt: new Date(),
          ...data,
        } as Row;
        rows.push(row);
        return row;
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i -= 1)
          if (matches(rows[i], where)) rows.splice(i, 1);
        return { count: before - rows.length };
      },
    },
  },
}));

const store = await import('./carsi-coaching-actions-store');

function seedProposed(id = 'a1', userId = 'member-1') {
  rows.push({
    id,
    userId,
    title: 'Claim your Google Business Profile',
    description: 'Why and how',
    status: 'proposed',
    dueDate: null,
    priority: 'high',
    progressNote: null,
    coachFeedback: null,
    goalId: 'marketing-pack:gbp-missing',
    sortOrder: 0,
    completedAt: null,
    createdAt: new Date(),
  });
}

beforeEach(() => {
  rows.length = 0;
});

describe('proposed actions in the actions store', () => {
  it('lists a proposed action as proposed, not silently as todo', async () => {
    seedProposed();
    const items = await store.listCoachingActionsForUser('member-1');
    expect(items[0].status).toBe('proposed');
  });

  it('a member cannot self-approve a proposed action through the normal upsert', async () => {
    seedProposed();
    const result = await store.upsertCoachingActionForUser('member-1', {
      id: 'a1',
      title: 'Claim your Google Business Profile',
      status: 'todo',
    });
    expect(result).toEqual({ ok: false, reason: 'awaiting_coach' });
    expect(rows[0].status).toBe('proposed');
  });

  it('a member cannot create an action already marked proposed or declined', async () => {
    await store.upsertCoachingActionForUser('member-1', {
      title: 'Sneaky',
      status: 'proposed' as never,
    });
    expect(rows[0].status).toBe('todo');
  });

  it('the coach approves a proposed action and it becomes a member to-do with feedback', async () => {
    seedProposed();
    const result = await store.reviewProposedCoachingAction({
      actionId: 'a1',
      decision: 'approve',
      coachFeedback: 'Do this first.',
    });
    expect(result).toEqual({ ok: true, status: 'todo' });
    expect(rows[0]).toMatchObject({ status: 'todo', coachFeedback: 'Do this first.' });
  });

  it('the coach can decline, and cannot review the same action twice', async () => {
    seedProposed();
    expect(
      await store.reviewProposedCoachingAction({ actionId: 'a1', decision: 'decline' })
    ).toEqual({ ok: true, status: 'declined' });
    expect(
      (await store.reviewProposedCoachingAction({ actionId: 'a1', decision: 'approve' })).ok
    ).toBe(false);
    expect(rows[0].status).toBe('declined');
  });

  it('a member cannot delete a proposed or declined action, but can delete their own working action', async () => {
    seedProposed('p1');
    rows.push({ ...rows[0], id: 'd1', status: 'declined' });
    rows.push({ ...rows[0], id: 'w1', status: 'todo', goalId: null });
    expect(await store.deleteCoachingActionForUser('member-1', 'p1')).toBe(false);
    expect(await store.deleteCoachingActionForUser('member-1', 'd1')).toBe(false);
    expect(await store.deleteCoachingActionForUser('member-1', 'w1')).toBe(true);
    expect(rows.map((r) => r.id).sort()).toEqual(['d1', 'p1']);
  });

  it('reviewing an unknown action is not found', async () => {
    expect(
      await store.reviewProposedCoachingAction({ actionId: 'nope', decision: 'approve' })
    ).toEqual({ ok: false, reason: 'not_found' });
  });

  it('replaceProposedMarketingActions keeps reviewed actions and replaces only pending ones', async () => {
    seedProposed('old-pending');
    rows.push({
      ...rows[0],
      id: 'approved',
      status: 'todo',
      goalId: 'marketing-pack:title-generic',
    });
    const created = await store.replaceProposedMarketingActions('member-1', [
      {
        title: 'Claim your Google Business Profile',
        description: 'x',
        status: 'proposed',
        priority: 'high',
        goalId: 'marketing-pack:gbp-missing',
        sortOrder: 0,
      },
      {
        title: 'Rewrite your page title',
        description: 'x',
        status: 'proposed',
        priority: 'medium',
        goalId: 'marketing-pack:title-generic',
        sortOrder: 1,
      },
    ]);
    // gbp-missing re-proposed (old pending replaced); title-generic already approved, so skipped.
    expect(created).toBe(1);
    expect(rows.filter((r) => r.status === 'proposed').map((r) => r.goalId)).toEqual([
      'marketing-pack:gbp-missing',
    ]);
    expect(rows.find((r) => r.id === 'approved')?.status).toBe('todo');
    expect(rows.find((r) => r.id === 'old-pending')).toBeUndefined();
  });
});
