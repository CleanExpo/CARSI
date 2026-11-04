/**
 * GP-629 AI monthly review, end to end on an in-memory store (the real Prisma store is covered by
 * carsi-coaching-monthly-review.pg.test.ts in CI). The model is always mocked.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import {
  MEMBER_BOARD_STATUSES,
  MONTHLY_DRAFT_STATUS,
  REVIEW_GOAL_PREFIX,
} from '@/lib/coaching-portal/monthly-review';
import {
  approveMonthlyReview,
  discardMonthlyReview,
  generateMonthlyReview,
  getMonthlyReviewView,
  MonthlyReviewConflictError,
  saveMonthlyReview,
  type MonthlyReviewMember,
  type MonthlyReviewRow,
  type MonthlyReviewStore,
} from '@/lib/server/carsi-coaching-monthly-review';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-11-04T00:00:00.000Z');
const SESSION_ID = '33333333-3333-4333-8333-333333333333';

type Row = MonthlyReviewRow & { userId: string };

function row(
  userId: string,
  id: string,
  title: string,
  status: string,
  extra: Partial<Row> = {}
): Row {
  return {
    userId,
    id,
    title,
    status,
    description: null,
    goalId: null,
    priority: null,
    dueDate: null,
    progressNote: null,
    assignedTo: 'customer',
    sortOrder: 0,
    ...extra,
  };
}

function demoStore() {
  const rows: Row[] = [
    row(USER, 'a1', 'Call every retail quote within 48 hours', 'done', {
      goalId: 'g1',
      progressNote: 'Two bookings came from it.',
    }),
    row(USER, 'a2', 'Block Friday morning for quoting', 'done', { goalId: 'g1' }),
    row(USER, 'a3', 'Write the crew lead job description', 'blocked', {
      goalId: 'g2',
      progressNote: 'Not sure what to pay a crew lead.',
    }),
    row(USER, 'a4', 'Ask two insurers about panel work', 'todo', { goalId: 'g1' }),
    row(USER, 'a5', 'Price a second van', 'todo'),
    row(OTHER, 'o1', 'Another member’s action', 'todo'),
  ];
  const plan = { latestGuidance: 'Keep the 48-hour call rule going.' as string | null };
  let nextId = 1;
  const writes: string[] = [];
  const member: MonthlyReviewMember = {
    memberName: 'Sam Rivers',
    businessName: 'Rivers Restoration',
    focusTitle: 'Turn retail quotes into bookings',
    latestGuidance: null,
    goalsJson: JSON.stringify([
      { id: 'g1', title: 'One more direct job booked per week' },
      { id: 'g2', title: 'Crew lead trained and running jobs' },
    ]),
    prepNotes: 'I want to talk about hiring.',
    nextSession: {
      id: SESSION_ID,
      scheduledAt: new Date('2026-11-10T00:00:00.000Z'),
      prepResponsesJson: JSON.stringify({
        challenges: 'Cash flow is tight in December.',
        discuss: 'Crew lead pay rates',
      }),
    },
  };
  const store: MonthlyReviewStore = {
    async withMemberLock(_userId, fn) {
      return fn(store);
    },
    async loadMember(userId) {
      writes.push(`load:${userId}`);
      return { ...member, latestGuidance: plan.latestGuidance };
    },
    async listRows(userId) {
      return rows.filter((r) => r.userId === userId).map((r) => ({ ...r }));
    },
    async deleteDraftRows(userId) {
      writes.push(`deleteDrafts:${userId}`);
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].userId === userId && rows[i].status === MONTHLY_DRAFT_STATUS) rows.splice(i, 1);
      }
    },
    async createRows(userId, input) {
      writes.push(`create:${userId}:${input.length}`);
      for (const r of input) {
        rows.push({
          userId,
          id: `n${nextId++}`,
          title: r.title,
          description: r.description,
          status: r.status,
          goalId: r.goalId,
          priority: r.priority,
          dueDate: r.dueDate,
          progressNote: null,
          assignedTo: r.assignedTo,
          sortOrder: r.sortOrder,
        });
      }
    },
    async setLatestGuidance(userId, text) {
      writes.push(`guidance:${userId}`);
      plan.latestGuidance = text;
    },
  };
  /** What the member's board read would return: only the four board statuses. */
  const memberBoard = (userId = USER) =>
    rows.filter(
      (r) => r.userId === userId && (MEMBER_BOARD_STATUSES as readonly string[]).includes(r.status)
    );
  return { store, rows, plan, writes, memberBoard, member };
}

/** The revision the coach's editor holds: the one the view returned. */
async function rev(t: { store: MonthlyReviewStore }) {
  return (await getMonthlyReviewView(USER, t.store, NOW)).revision;
}

const MODEL_REPLY = JSON.stringify({
  summary: 'Quotes are turning into bookings; hiring is the open question.',
  guidance: 'Hold the 48-hour call rule. Set a crew lead pay range before you advertise.',
  actions: [
    {
      title: 'Set a crew lead pay range',
      description: 'Two award rates.',
      goalId: 'g2',
      priority: 'high',
      dueInDays: 10,
    },
    { title: 'Plan December cash flow week by week', goalId: 'g1', priority: 'high', dueInDays: 7 },
    { title: 'Book the two insurer calls', goalId: 'g1', priority: 'medium', dueInDays: 14 },
    { title: 'Draft the crew lead advert', goalId: 'g2', priority: 'medium', dueInDays: 21 },
  ],
});

describe('generateMonthlyReview (GP-629 demo member)', () => {
  it('produces a month-in-review, 3–7 draft actions and draft guidance, all invisible to the member', async () => {
    const t = demoStore();
    const boardBefore = t.memberBoard().map((r) => r.id);
    const draftWithModel = vi.fn().mockResolvedValue({ text: MODEL_REPLY, model: 'mock/model' });

    const view = await generateMonthlyReview(USER, { store: t.store, now: NOW, draftWithModel });

    expect(draftWithModel).toHaveBeenCalledTimes(1);
    expect(view.status).toBe('draft');
    expect(view.source).toBe('model');
    expect(view.nextSession?.id).toBe(SESSION_ID);
    expect(view.review?.counts).toEqual({ total: 5, done: 2, blocked: 1, open: 2 });
    expect(view.review?.blocked[0]).toEqual({
      title: 'Write the crew lead job description',
      reason: 'Not sure what to pay a crew lead.',
    });
    expect(view.review?.memberFlagged).toContain('To discuss: Crew lead pay rates');
    expect(view.actions.length).toBeGreaterThanOrEqual(3);
    expect(view.actions.length).toBeLessThanOrEqual(7);
    for (const a of view.actions) {
      expect(a.goalId === null || ['g1', 'g2'].includes(a.goalId)).toBe(true);
      expect(['high', 'medium', 'low']).toContain(a.priority);
      expect(a.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(view.guidance).toContain('crew lead pay range');

    // Nothing reached the member: same board, same guidance.
    expect(t.memberBoard().map((r) => r.id)).toEqual(boardBefore);
    expect(t.plan.latestGuidance).toBe('Keep the 48-hour call rule going.');

    // Drafts are held with values the T0 CHECK (customer|coach) allows, never 'coach-draft'.
    const drafts = t.rows.filter((r) => r.status === MONTHLY_DRAFT_STATUS);
    expect(drafts.length).toBe(view.actions.length + 1);
    for (const d of drafts) expect(['customer', 'coach']).toContain(d.assignedTo);
    expect(drafts.filter((d) => d.goalId?.startsWith(REVIEW_GOAL_PREFIX))).toHaveLength(1);
    expect(drafts.every((d) => (d.goalId ?? '').length <= 64)).toBe(true);
    expect(t.writes.some((w) => w.includes(OTHER))).toBe(false);
  });

  it('works with no AI configured (fallback grounded in the board)', async () => {
    const t = demoStore();
    const view = await generateMonthlyReview(USER, {
      store: t.store,
      now: NOW,
      draftWithModel: async () => null,
    });
    expect(view.source).toBe('fallback');
    expect(view.actions.length).toBeGreaterThanOrEqual(3);
    expect(view.actions[0].title).toBe('Unblock: Write the crew lead job description');
  });

  it('regenerating replaces the earlier drafts instead of piling them up', async () => {
    const t = demoStore();
    const deps = { store: t.store, now: NOW, draftWithModel: async () => null };
    await generateMonthlyReview(USER, deps);
    const first = t.rows.filter((r) => r.status === MONTHLY_DRAFT_STATUS).length;
    await generateMonthlyReview(USER, deps);
    expect(t.rows.filter((r) => r.status === MONTHLY_DRAFT_STATUS).length).toBe(first);
  });

  it('a slow draft that started before an approval never writes a new draft after it (review r1 P1)', async () => {
    const t = demoStore();
    await generateMonthlyReview(USER, {
      store: t.store,
      now: NOW,
      draftWithModel: async () => null,
    });

    let release!: (v: { text: string; model: string } | null) => void;
    const slow = generateMonthlyReview(USER, {
      store: t.store,
      now: NOW,
      draftWithModel: () => new Promise((r) => (release = r)),
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(await approveMonthlyReview(USER, undefined, await rev(t), t.store)).toMatchObject({
      status: 'approved',
    });
    const boardAfterApprove = t.memberBoard().length;

    release({ text: MODEL_REPLY, model: 'mock/model' });
    await expect(slow).rejects.toThrow(MonthlyReviewConflictError);
    expect(t.rows.some((r) => r.status === MONTHLY_DRAFT_STATUS)).toBe(false);
    expect(await approveMonthlyReview(USER, undefined, null, t.store)).toEqual({
      status: 'nothing_to_approve',
    });
    expect(t.memberBoard().length).toBe(boardAfterApprove);
  });

  it('a slow draft loses to a discard that happened while it waited', async () => {
    const t = demoStore();
    await generateMonthlyReview(USER, {
      store: t.store,
      now: NOW,
      draftWithModel: async () => null,
    });
    let release!: (v: null) => void;
    const slow = generateMonthlyReview(USER, {
      store: t.store,
      now: NOW,
      draftWithModel: () => new Promise((r) => (release = r)),
    });
    await Promise.resolve();
    await Promise.resolve();
    await discardMonthlyReview(USER, await rev(t), t.store);
    release(null);
    await expect(slow).rejects.toThrow(MonthlyReviewConflictError);
    expect(t.rows.some((r) => r.status === MONTHLY_DRAFT_STATUS)).toBe(false);
  });

  it('refuses to draft without a booked next session, so a review always keys to one session (review r2 P1)', async () => {
    const t = demoStore();
    const noSession: MonthlyReviewStore = {
      ...t.store,
      async withMemberLock(_userId, fn) {
        return fn(noSession);
      },
      async loadMember(userId, now) {
        return { ...(await t.store.loadMember(userId, now)), nextSession: null };
      },
    };
    const deps = { store: noSession, now: NOW, draftWithModel: async () => null };
    await expect(generateMonthlyReview(USER, deps)).rejects.toThrow(MonthlyReviewConflictError);
    expect(t.rows.some((r) => r.status === MONTHLY_DRAFT_STATUS)).toBe(false);
    expect(await approveMonthlyReview(USER, undefined, null, noSession)).toEqual({
      status: 'nothing_to_approve',
    });
    expect(t.memberBoard().map((r) => r.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
  });

  it('refuses to draft again for a session whose review is already approved', async () => {
    const t = demoStore();
    const deps = { store: t.store, now: NOW, draftWithModel: async () => null };
    await generateMonthlyReview(USER, deps);
    await approveMonthlyReview(USER, undefined, await rev(t), t.store);
    await expect(generateMonthlyReview(USER, deps)).rejects.toThrow(MonthlyReviewConflictError);
    expect(t.rows.some((r) => r.status === MONTHLY_DRAFT_STATUS)).toBe(false);
  });
});

describe('coach edit, approve and discard', () => {
  async function generated() {
    const t = demoStore();
    await generateMonthlyReview(USER, {
      store: t.store,
      now: NOW,
      draftWithModel: async () => ({ text: MODEL_REPLY, model: 'mock/model' }),
    });
    return t;
  }

  it('saving edits keeps everything hidden from the member', async () => {
    const t = await generated();
    const view = await getMonthlyReviewView(USER, t.store);
    const res = await saveMonthlyReview(
      USER,
      {
        guidance: 'Edited guidance from the coach.',
        actions: [
          { ...view.actions[0], title: 'Set a crew lead pay range (coach edit)' },
          view.actions[1],
          view.actions[2],
        ],
      },
      view.revision,
      t.store
    );
    expect(res.status).toBe('saved');
    const after = await getMonthlyReviewView(USER, t.store);
    expect(after.guidance).toBe('Edited guidance from the coach.');
    expect(after.actions.map((a) => a.title)[0]).toBe('Set a crew lead pay range (coach edit)');
    expect(after.actions).toHaveLength(3);
    expect(t.memberBoard().map((r) => r.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
    expect(t.plan.latestGuidance).toBe('Keep the 48-hour call rule going.');
  });

  it('approve-all publishes drafts as todo on the member board and sets latest guidance', async () => {
    const t = await generated();
    const view = await getMonthlyReviewView(USER, t.store);
    const res = await approveMonthlyReview(USER, undefined, view.revision, t.store);
    expect(res).toEqual({ status: 'approved', published: view.actions.length });

    const board = t.memberBoard();
    const published = board.filter((r) => !['a1', 'a2', 'a3', 'a4', 'a5'].includes(r.id));
    expect(published.map((r) => r.title)).toEqual(view.actions.map((a) => a.title));
    for (const p of published) {
      expect(p.status).toBe('todo');
      expect(p.assignedTo).toBe('coach');
      expect(p.dueDate).toBeInstanceOf(Date);
    }
    expect(t.plan.latestGuidance).toBe(view.guidance);
    expect(t.rows.some((r) => r.status === MONTHLY_DRAFT_STATUS)).toBe(false);
    // The approved review is kept for the coach's history, still off the member board.
    const closed = t.rows.filter((r) => r.goalId?.startsWith(REVIEW_GOAL_PREFIX));
    expect(closed).toHaveLength(1);
    expect((MEMBER_BOARD_STATUSES as readonly string[]).includes(closed[0].status)).toBe(false);

    expect((await getMonthlyReviewView(USER, t.store)).status).toBe('none');
  });

  it('approve with edits publishes the edited set', async () => {
    const t = await generated();
    const view = await getMonthlyReviewView(USER, t.store);
    await approveMonthlyReview(
      USER,
      {
        guidance: 'Final words.',
        actions: [{ ...view.actions[0], title: 'Only this one' }],
      },
      view.revision,
      t.store
    );
    const published = t.memberBoard().filter((r) => !r.id.startsWith('a'));
    expect(published.map((r) => r.title)).toEqual(['Only this one']);
    expect(t.plan.latestGuidance).toBe('Final words.');
  });

  it('approving twice publishes once', async () => {
    const t = await generated();
    const revision = await rev(t);
    await approveMonthlyReview(USER, undefined, revision, t.store);
    const count = t.memberBoard().length;
    expect(await approveMonthlyReview(USER, undefined, revision, t.store)).toEqual({
      status: 'nothing_to_approve',
    });
    expect(t.memberBoard().length).toBe(count);
  });

  it('rejects invalid coach edits without touching anything', async () => {
    const t = await generated();
    const before = JSON.stringify(t.rows);
    const view = await getMonthlyReviewView(USER, t.store);
    for (const edits of [
      { guidance: '', actions: view.actions },
      { guidance: 'ok', actions: [{ ...view.actions[0], title: '  ' }] },
      { guidance: 'ok', actions: [{ ...view.actions[0], goalId: 'g99' }] },
      { guidance: 'ok', actions: [{ ...view.actions[0], dueDate: '2026-13-45' }] },
      { guidance: 'ok', actions: [{ ...view.actions[0], priority: 'urgent' }] },
    ]) {
      const res = await approveMonthlyReview(USER, edits as never, view.revision, t.store);
      expect(res.status).toBe('invalid');
    }
    expect(JSON.stringify(t.rows)).toBe(before);
    expect(t.plan.latestGuidance).toBe('Keep the 48-hour call rule going.');
  });

  it('discard removes the drafts and leaves the member untouched', async () => {
    const t = await generated();
    expect(await discardMonthlyReview(USER, await rev(t), t.store)).toEqual({
      status: 'discarded',
    });
    expect(t.rows.some((r) => r.status === MONTHLY_DRAFT_STATUS)).toBe(false);
    expect(t.memberBoard().map((r) => r.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
    expect((await getMonthlyReviewView(USER, t.store)).status).toBe('none');
  });

  it('a stale editor tab cannot approve over a newer saved draft (review r3 P1)', async () => {
    const t = await generated();
    const tabA = await getMonthlyReviewView(USER, t.store, NOW);
    // Tab B saves a different draft; the draft revision moves on.
    const tabB = await getMonthlyReviewView(USER, t.store, NOW);
    expect(
      await saveMonthlyReview(
        USER,
        { guidance: 'Tab B guidance.', actions: [tabB.actions[0]] },
        tabB.revision,
        t.store,
        NOW
      )
    ).toEqual({ status: 'saved' });
    const boardBefore = t.memberBoard().map((r) => r.id);

    // Tab A approves what it last saw.
    const res = await approveMonthlyReview(
      USER,
      { guidance: tabA.guidance, actions: tabA.actions },
      tabA.revision,
      t.store,
      NOW
    );
    expect(res.status).toBe('conflict');
    expect(t.memberBoard().map((r) => r.id)).toEqual(boardBefore);
    expect(t.plan.latestGuidance).toBe('Keep the 48-hour call rule going.');
    expect((await getMonthlyReviewView(USER, t.store, NOW)).guidance).toBe('Tab B guidance.');
    // A stale save and a stale discard are refused the same way.
    expect(
      (await saveMonthlyReview(USER, { guidance: 'x', actions: [] }, tabA.revision, t.store, NOW))
        .status
    ).toBe('conflict');
    expect((await discardMonthlyReview(USER, tabA.revision, t.store)).status).toBe('conflict');
    expect((await getMonthlyReviewView(USER, t.store, NOW)).status).toBe('draft');
    // A write without any revision is refused too.
    expect((await approveMonthlyReview(USER, undefined, null, t.store, NOW)).status).toBe(
      'conflict'
    );
    expect(t.plan.latestGuidance).toBe('Keep the 48-hour call rule going.');
  });

  it('a draft made for a session that was replaced cannot be published (review r3 P1)', async () => {
    const t = await generated();
    t.member.nextSession = {
      id: '44444444-4444-4444-8444-444444444444',
      scheduledAt: new Date('2026-11-17T00:00:00.000Z'),
      prepResponsesJson: null,
    };
    const view = await getMonthlyReviewView(USER, t.store, NOW);
    expect(view.status).toBe('draft');
    expect(view.stale).toBe(true);
    const boardBefore = t.memberBoard().map((r) => r.id);
    expect((await approveMonthlyReview(USER, undefined, view.revision, t.store, NOW)).status).toBe(
      'conflict'
    );
    expect(
      (
        await saveMonthlyReview(
          USER,
          { guidance: view.guidance, actions: view.actions },
          view.revision,
          t.store,
          NOW
        )
      ).status
    ).toBe('conflict');
    expect(t.memberBoard().map((r) => r.id)).toEqual(boardBefore);
    expect(t.plan.latestGuidance).toBe('Keep the 48-hour call rule going.');

    // Drafting again for the new session replaces the stale draft and can then be approved.
    await generateMonthlyReview(USER, {
      store: t.store,
      now: NOW,
      draftWithModel: async () => null,
    });
    const fresh = await getMonthlyReviewView(USER, t.store, NOW);
    expect(fresh.stale).toBe(false);
    expect((await approveMonthlyReview(USER, undefined, fresh.revision, t.store, NOW)).status).toBe(
      'approved'
    );
  });

  it('a fresh draft is not stale and carries a revision', async () => {
    const t = await generated();
    const view = await getMonthlyReviewView(USER, t.store, NOW);
    expect(view.stale).toBe(false);
    expect(typeof view.revision).toBe('string');
  });
});
