import { describe, expect, it } from 'vitest';

import {
  buildMonthInReview,
  buildMonthlyReviewMessages,
  composeMonthlyReviewDraft,
  MAX_DRAFT_ACTIONS,
  MIN_DRAFT_ACTIONS,
  type MonthlyReviewInput,
} from '@/lib/coaching-portal/monthly-review';

const NOW = new Date('2026-11-04T00:00:00.000Z');
const NEXT_SESSION = new Date('2026-11-10T00:00:00.000Z');

/** The GP-629 "Done when" member: 5 actions (2 done, 1 blocked, 2 todo) and a prep note. */
function demoInput(overrides: Partial<MonthlyReviewInput> = {}): MonthlyReviewInput {
  return {
    memberName: 'Sam Rivers',
    businessName: 'Rivers Restoration',
    focusTitle: 'Turn retail quotes into bookings',
    latestGuidance: 'Keep the 48-hour call rule going before adding anything new.',
    goals: [
      { id: 'g1', title: 'One more direct job booked per week' },
      { id: 'g2', title: 'Crew lead trained and running jobs' },
    ],
    actions: [
      {
        id: 'a1',
        title: 'Call every retail quote within 48 hours',
        status: 'done',
        progressNote: 'Done for three weeks running, two bookings came from it.',
        goalId: 'g1',
      },
      {
        id: 'a2',
        title: 'Block Friday morning for quoting',
        status: 'done',
        progressNote: null,
        goalId: 'g1',
      },
      {
        id: 'a3',
        title: 'Write the crew lead job description',
        status: 'blocked',
        progressNote: 'Stuck: not sure what to pay a crew lead.',
        goalId: 'g2',
      },
      {
        id: 'a4',
        title: 'Ask two insurers about panel work',
        status: 'todo',
        progressNote: null,
        goalId: 'g1',
      },
      {
        id: 'a5',
        title: 'Price a second van',
        status: 'todo',
        progressNote: null,
        goalId: null,
      },
    ],
    prepNotes: 'I want to talk about hiring and whether I can afford it.',
    sessionPrep: {
      progress: 'Quotes are converting better.',
      challenges: 'Cash flow is tight in December.',
      discuss: 'Crew lead pay rates',
    },
    nextSessionAt: NEXT_SESSION,
    now: NOW,
    ...overrides,
  };
}

describe('buildMonthInReview (deterministic facts, no model)', () => {
  it('lists what was completed, what stayed blocked and why, what is open and what the member flagged', () => {
    const review = buildMonthInReview(demoInput());
    expect(review.completed.map((c) => c.title)).toEqual([
      'Call every retail quote within 48 hours',
      'Block Friday morning for quoting',
    ]);
    expect(review.blocked).toEqual([
      {
        title: 'Write the crew lead job description',
        reason: 'Stuck: not sure what to pay a crew lead.',
      },
    ]);
    expect(review.open.map((o) => o.title)).toEqual([
      'Ask two insurers about panel work',
      'Price a second van',
    ]);
    expect(review.memberFlagged).toEqual([
      'Progress: Quotes are converting better.',
      'Challenge: Cash flow is tight in December.',
      'To discuss: Crew lead pay rates',
      'Prep note: I want to talk about hiring and whether I can afford it.',
    ]);
    expect(review.counts).toEqual({ total: 5, done: 2, blocked: 1, open: 2 });
  });

  it('says a blocked action had no reason given rather than inventing one', () => {
    const input = demoInput();
    input.actions[2] = { ...input.actions[2], progressNote: '   ' };
    expect(buildMonthInReview(input).blocked[0].reason).toBe('No reason recorded on the board.');
  });

  it('ignores rows that are not on the member board (drafts, review bundles, removed courses)', () => {
    const input = demoInput();
    input.actions.push(
      { id: 'x1', title: 'Old draft', status: 'draft', progressNote: null, goalId: null },
      { id: 'x2', title: 'Removed course', status: 'removed', progressNote: null, goalId: null }
    );
    expect(buildMonthInReview(input).counts.total).toBe(5);
  });
});

describe('buildMonthlyReviewMessages', () => {
  it('grounds the prompt only in the member’s own board, plan and prep', () => {
    const input = demoInput();
    const messages = buildMonthlyReviewMessages(input, buildMonthInReview(input));
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toMatch(/only the facts/i);
    expect(messages[0].content).toMatch(/Australian English/);
    expect(messages[0].content).not.toMatch(/IICRC/);
    const user = messages[1].content;
    expect(user).toContain('Write the crew lead job description');
    expect(user).toContain('Stuck: not sure what to pay a crew lead.');
    expect(user).toContain('Crew lead pay rates');
    expect(user).toContain('g2: Crew lead trained and running jobs');
  });
});

describe('composeMonthlyReviewDraft', () => {
  const modelJson = (
    actions: unknown[],
    guidance = 'Lock in the call rule, then sort crew lead pay.'
  ) => JSON.stringify({ summary: 'A strong month on quotes.', guidance, actions });

  it('uses valid model output: 3–7 actions with goal link, priority and a due date before the following session', () => {
    const input = demoInput();
    const raw = modelJson([
      {
        title: 'Set a crew lead pay range',
        description: 'Use two award rates.',
        goalId: 'g2',
        priority: 'high',
        dueInDays: 10,
      },
      {
        title: 'Follow up the two insurers',
        description: null,
        goalId: 'g1',
        priority: 'medium',
        dueInDays: 14,
      },
      {
        title: 'Plan December cash flow',
        description: 'Week by week.',
        goalId: 'g1',
        priority: 'high',
        dueInDays: 7,
      },
    ]);
    const draft = composeMonthlyReviewDraft(input, '```json\n' + raw + '\n```');
    expect(draft.source).toBe('model');
    expect(draft.actions).toHaveLength(3);
    expect(draft.actions[0]).toMatchObject({
      title: 'Set a crew lead pay range',
      goalId: 'g2',
      priority: 'high',
    });
    expect(draft.actions[0].dueDate).toBe('2026-11-20');
    expect(draft.guidance).toBe('Lock in the call rule, then sort crew lead pay.');
    expect(draft.review.summary).toBe('A strong month on quotes.');
  });

  it('drops a goal link the plan does not have, and clamps priority and due date', () => {
    const draft = composeMonthlyReviewDraft(
      demoInput(),
      modelJson([
        { title: 'One', goalId: 'g99', priority: 'urgent', dueInDays: 400 },
        { title: 'Two', goalId: 'g1', priority: 'low', dueInDays: -3 },
        { title: 'Three', goalId: 'g2', priority: 'medium', dueInDays: 'soon' },
      ])
    );
    expect(draft.actions[0].goalId).toBeNull();
    expect(draft.actions[0].priority).toBe('medium');
    expect(draft.actions[0].dueDate).toBe('2026-12-08');
    expect(draft.actions[1].dueDate).toBe('2026-11-11');
    expect(draft.actions[2].dueDate).toBe('2026-12-08');
  });

  it('tops up a short model list from the board so there are always at least 3', () => {
    const draft = composeMonthlyReviewDraft(
      demoInput(),
      modelJson([
        { title: 'Set a crew lead pay range', goalId: 'g2', priority: 'high', dueInDays: 10 },
      ])
    );
    expect(draft.actions.length).toBeGreaterThanOrEqual(MIN_DRAFT_ACTIONS);
    expect(draft.actions[0].title).toBe('Set a crew lead pay range');
  });

  it('drops a model action that repeats one already open on the board', () => {
    const draft = composeMonthlyReviewDraft(
      demoInput(),
      modelJson([
        {
          title: 'ask two insurers about panel work',
          goalId: 'g1',
          priority: 'high',
          dueInDays: 5,
        },
        { title: 'Set a crew lead pay range', goalId: 'g2', priority: 'high', dueInDays: 5 },
        { title: 'Plan December cash flow', goalId: 'g1', priority: 'high', dueInDays: 5 },
        { title: 'Ask a mate who runs a crew', goalId: 'g2', priority: 'low', dueInDays: 5 },
      ])
    );
    expect(draft.actions.map((a) => a.title.toLowerCase())).not.toContain(
      'ask two insurers about panel work'
    );
    expect(draft.actions).toHaveLength(3);
  });

  it('caps a long model list at 7', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      title: `Action ${i + 1}`,
      goalId: 'g1',
      priority: 'low',
      dueInDays: 5,
    }));
    expect(composeMonthlyReviewDraft(demoInput(), modelJson(many)).actions).toHaveLength(
      MAX_DRAFT_ACTIONS
    );
  });

  it('rejects model actions or guidance that make outcome guarantees or credential claims', () => {
    const draft = composeMonthlyReviewDraft(
      demoInput(),
      modelJson(
        [
          { title: 'Guarantee 10 new jobs', goalId: 'g1', priority: 'high', dueInDays: 5 },
          { title: 'Add the IICRC logo to the van', goalId: 'g2', priority: 'high', dueInDays: 5 },
          { title: 'Set a crew lead pay range', goalId: 'g2', priority: 'high', dueInDays: 5 },
        ],
        'This plan is guaranteed to double revenue.'
      )
    );
    const titles = draft.actions.map((a) => a.title.toLowerCase());
    expect(titles.some((t) => t.includes('guarantee') || t.includes('iicrc'))).toBe(false);
    expect(draft.guidance.toLowerCase()).not.toContain('guarantee');
  });

  it('falls back to a board-grounded draft when the model is unavailable or returns junk', () => {
    for (const raw of [null, 'not json at all', '{"actions": "nope"}']) {
      const draft = composeMonthlyReviewDraft(demoInput(), raw);
      expect(draft.source).toBe('fallback');
      expect(draft.actions.length).toBeGreaterThanOrEqual(MIN_DRAFT_ACTIONS);
      expect(draft.actions.length).toBeLessThanOrEqual(MAX_DRAFT_ACTIONS);
      const titles = draft.actions.map((a) => a.title);
      // Blocked first, then what the member flagged. Open todos stay on the board as they are,
      // so they are never duplicated as new drafts.
      expect(titles).toEqual([
        'Unblock: Write the crew lead job description',
        'Act on what you flagged: Cash flow is tight in December.',
        'Follow up from the session: Crew lead pay rates',
      ]);
      expect(draft.actions[0].goalId).toBe('g2');
      expect(draft.guidance).toMatch(/2 of 5 actions/);
      expect(draft.guidance).toContain('Write the crew lead job description');
      expect(draft.review.summary).toMatch(/2 of 5 actions done/);
    }
  });

  it('still produces 3 grounded drafts for a member with an empty board', () => {
    const draft = composeMonthlyReviewDraft(
      demoInput({ actions: [], prepNotes: '', sessionPrep: null }),
      null
    );
    expect(draft.actions).toHaveLength(3);
    expect(draft.actions.map((a) => a.goalId)).toEqual(['g1', 'g2', null]);
  });
});
