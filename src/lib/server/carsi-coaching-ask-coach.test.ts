import { describe, expect, it } from 'vitest';

import { askCoachGoalId, type CoachKnowledgeBase } from '@/lib/coaching-portal/ask-my-coach';
import {
  answerCoachQuestion,
  askMyCoach,
  listCoachInbox,
  listMyCoachQuestions,
  type AskCoachQuestionRecord,
  type AskCoachStore,
} from '@/lib/server/carsi-coaching-ask-coach';

const MEMBER_A = '11111111-1111-4111-8111-111111111111';
const MEMBER_B = '22222222-2222-4222-8222-222222222222';

const KB_X: CoachKnowledgeBase = {
  coachId: 'coach-x',
  items: [
    {
      id: 'x-gbp',
      title: 'Google Business Profile & local search',
      body: 'Categories, service areas, photos, posts, and reviews, structured so you show up when locals search.',
      sourceLabel: 'Coach X programme',
      sourceHref: '/ccw-training',
    },
  ],
};

const KB_Y: CoachKnowledgeBase = {
  coachId: 'coach-y',
  items: [
    {
      id: 'y-hiring',
      title: 'Hiring your second technician',
      body: 'Hire your second technician when the phone rings for jobs you are turning away for six weeks running.',
      sourceLabel: 'Coach Y private notes',
      sourceHref: '/coach-y/hiring',
    },
  ],
};

function fakeStore(assignments: Record<string, string>) {
  const rows: AskCoachQuestionRecord[] = [];
  let n = 0;
  const store: AskCoachStore = {
    async coachIdForMember(userId) {
      return assignments[userId] ?? null;
    },
    async createQuestion(userId, input) {
      n += 1;
      const row: AskCoachQuestionRecord = {
        id: `q${n}`,
        userId,
        coachId: input.coachId,
        question: input.question,
        status: 'todo',
        coachAnswer: null,
        createdAt: new Date(2026, 10, 4, 9, n),
        answeredAt: null,
      };
      rows.push(row);
      return row;
    },
    async listQuestionsForMember(userId) {
      return rows.filter((r) => r.userId === userId);
    },
    async listOpenQuestionsForCoach(coachId) {
      return rows
        .filter((r) => r.coachId === coachId && r.coachAnswer === null)
        .map((r) => ({ ...r, memberLabel: `member ${r.userId.slice(0, 4)}` }));
    },
    async findQuestionForCoach(coachId, id) {
      return rows.find((r) => r.id === id && r.coachId === coachId) ?? null;
    },
    async saveCoachAnswer(id, answer) {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error('missing');
      if (row.coachAnswer !== null) return null;
      row.coachAnswer = answer;
      row.status = 'done';
      row.answeredAt = new Date();
      return row;
    },
  };
  return { store, rows };
}

const kbLookup = (coachId: string) => ({ 'coach-x': KB_X, 'coach-y': KB_Y })[coachId] ?? null;

describe('askMyCoach', () => {
  it('(a) answers from the member’s own coach knowledge base, with citations', async () => {
    const { store, rows } = fakeStore({ [MEMBER_A]: 'coach-x' });
    const r = await askMyCoach(
      store,
      kbLookup,
      MEMBER_A,
      'How do I get more Google Business Profile reviews?'
    );
    expect(r.status).toBe('answered');
    if (r.status !== 'answered') return;
    expect(r.citations.map((c) => c.itemId)).toEqual(['x-gbp']);
    expect(rows).toHaveLength(0);
  });

  it('(b) does not answer an ungrounded question; creates one open question for the coach', async () => {
    const { store, rows } = fakeStore({ [MEMBER_A]: 'coach-x' });
    const r = await askMyCoach(store, kbLookup, MEMBER_A, 'Should I lease or buy my next van?');
    expect(r.status).toBe('sent_to_coach');
    expect(r).not.toHaveProperty('passages');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: MEMBER_A,
      coachId: 'coach-x',
      question: 'Should I lease or buy my next van?',
      coachAnswer: null,
    });
    expect(await listCoachInbox(store, 'coach-x')).toHaveLength(1);
  });

  it('(b) compliance topics go to the coach even when the material matches', async () => {
    const { store, rows } = fakeStore({ [MEMBER_A]: 'coach-x' });
    const r = await askMyCoach(
      store,
      kbLookup,
      MEMBER_A,
      'Do Google Business Profile reviews earn CEC hours?'
    );
    expect(r.status).toBe('sent_to_coach');
    expect(rows).toHaveLength(1);
  });

  it('(b) a recertification question creates an open coach item, not an answer', async () => {
    const { store, rows } = fakeStore({ [MEMBER_A]: 'coach-x' });
    const r = await askMyCoach(
      store,
      kbLookup,
      MEMBER_A,
      'What recertification options do I have for Google Business Profile reviews?'
    );
    expect(r).toMatchObject({ status: 'sent_to_coach', reason: 'compliance_topic' });
    expect(rows).toHaveLength(1);
    expect(rows[0].coachAnswer).toBeNull();
  });

  it('(c) never cites another coach’s knowledge base', async () => {
    // Coach Y's material answers this; member A belongs to coach X, whose material does not.
    const { store, rows } = fakeStore({ [MEMBER_A]: 'coach-x', [MEMBER_B]: 'coach-y' });
    const q = 'When should I hire my second technician for the jobs I am turning away?';
    const forA = await askMyCoach(store, kbLookup, MEMBER_A, q);
    expect(forA.status).toBe('sent_to_coach');
    expect(JSON.stringify(forA)).not.toContain('y-hiring');
    expect(rows[0].coachId).toBe('coach-x');
    // The same question from coach Y's member is answered from coach Y's material.
    const forB = await askMyCoach(store, kbLookup, MEMBER_B, q);
    expect(forB.status).toBe('answered');
  });

  it('(c) a member with no coach gets no answer and creates nothing', async () => {
    const { store, rows } = fakeStore({});
    const r = await askMyCoach(store, kbLookup, MEMBER_A, 'How do I get more Google reviews?');
    expect(r).toEqual({ status: 'no_coach' });
    expect(rows).toHaveLength(0);
  });

  it('rejects an invalid question without writing', async () => {
    const { store, rows } = fakeStore({ [MEMBER_A]: 'coach-x' });
    expect(await askMyCoach(store, kbLookup, MEMBER_A, '  ')).toEqual({ status: 'invalid' });
    expect(rows).toHaveLength(0);
  });
});

describe('member and coach views', () => {
  it('(c) a member only ever sees their own questions', async () => {
    const { store } = fakeStore({ [MEMBER_A]: 'coach-x', [MEMBER_B]: 'coach-x' });
    await askMyCoach(store, kbLookup, MEMBER_A, 'Should I lease or buy my next van?');
    await askMyCoach(store, kbLookup, MEMBER_B, 'What should I name my second brand?');
    const mine = await listMyCoachQuestions(store, MEMBER_A);
    expect(mine.map((q) => q.question)).toEqual(['Should I lease or buy my next van?']);
    expect(JSON.stringify(mine)).not.toContain(MEMBER_B);
  });

  it('(c) a coach only sees and answers questions routed to them, once', async () => {
    const { store } = fakeStore({ [MEMBER_A]: 'coach-x', [MEMBER_B]: 'coach-y' });
    await askMyCoach(store, kbLookup, MEMBER_A, 'Should I lease or buy my next van?');
    await askMyCoach(store, kbLookup, MEMBER_B, 'Should I lease or buy my next ute?');
    const inboxX = await listCoachInbox(store, 'coach-x');
    expect(inboxX.map((q) => q.question)).toEqual(['Should I lease or buy my next van?']);
    const qForY = (await listCoachInbox(store, 'coach-y'))[0];

    expect(await answerCoachQuestion(store, 'coach-x', qForY.id, 'Lease it.')).toBe('not_found');
    expect(await answerCoachQuestion(store, 'coach-x', inboxX[0].id, '  ')).toBe('invalid');
    expect(await answerCoachQuestion(store, 'coach-x', inboxX[0].id, 'Buy it outright.')).toBe(
      'answered'
    );
    expect(await answerCoachQuestion(store, 'coach-x', inboxX[0].id, 'Changed my mind.')).toBe(
      'already_answered'
    );
    expect(await listCoachInbox(store, 'coach-x')).toHaveLength(0);

    const mine = await listMyCoachQuestions(store, MEMBER_A);
    expect(mine[0]).toMatchObject({ coachAnswer: 'Buy it outright.', status: 'answered' });
  });

  it('tags escalations with the coach goal id used on the action board', () => {
    expect(askCoachGoalId('coach-x')).toBe('ask-coach:coach-x');
  });
});
