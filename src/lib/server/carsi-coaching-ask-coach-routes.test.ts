/**
 * GP-630 — drives the real Ask my coach route handlers with auth and storage mocked.
 * Proves: 401 when logged out (checked before the flag), 404 while the flag is off,
 * 403 without an active coaching subscription, and that a member can never steer the
 * question to another member or coach through the request body.
 */
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AskCoachQuestionRecord, AskCoachStore } from '@/lib/server/carsi-coaching-ask-coach';

const MEMBER_A = '11111111-1111-4111-8111-111111111111';
const MEMBER_B = '22222222-2222-4222-8222-222222222222';

const state = vi.hoisted(() => ({
  claims: null as { sub: string } | null,
  entitled: true,
  admin: false,
  rows: [] as AskCoachQuestionRecord[],
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => state.claims,
}));

vi.mock('@/lib/server/carsi-coaching-portal-gate', () => ({
  requireCoachingPortalEditor: async () => {
    if (!state.claims) {
      return { error: NextResponse.json({ detail: 'Sign in required.' }, { status: 401 }) };
    }
    if (!state.entitled) {
      return {
        error: NextResponse.json(
          { detail: 'Active coaching subscription required.' },
          { status: 403 }
        ),
      };
    }
    return { claims: state.claims, entitled: true };
  },
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: async () => (state.admin ? { sub: 'admin' } : null),
}));

vi.mock('@/lib/server/carsi-coaching-ask-coach-store', () => {
  const store: AskCoachStore = {
    async coachIdForMember() {
      return 'coach-phill-mcgurk';
    },
    async createQuestion(userId, input) {
      const row: AskCoachQuestionRecord = {
        id: `q${state.rows.length + 1}`,
        userId,
        coachId: input.coachId,
        question: input.question,
        status: 'todo',
        coachAnswer: null,
        createdAt: new Date(),
        answeredAt: null,
      };
      state.rows.push(row);
      return row;
    },
    async listQuestionsForMember(userId) {
      return state.rows.filter((r) => r.userId === userId);
    },
    async listOpenQuestionsForCoach(coachId) {
      return state.rows
        .filter((r) => r.coachId === coachId && r.coachAnswer === null)
        .map((r) => ({ ...r, memberLabel: 'Member' }));
    },
    async findQuestionForCoach(coachId, id) {
      return state.rows.find((r) => r.id === id && r.coachId === coachId) ?? null;
    },
    async saveCoachAnswer(id, answer) {
      const row = state.rows.find((r) => r.id === id);
      if (!row || row.coachAnswer !== null) return null;
      row.coachAnswer = answer;
      row.status = 'done';
      row.answeredAt = new Date();
      return row;
    },
  };
  return { getAskCoachStore: () => store };
});

import {
  GET as memberGET,
  POST as memberPOST,
} from '../../../app/api/coaching/portal/ask-coach/route';
import {
  GET as coachGET,
  POST as coachPOST,
} from '../../../app/api/admin/coaching/questions/route';

function req(url: string, body?: unknown) {
  return new NextRequest(
    url,
    body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body) }
  );
}

const MEMBER_URL = 'http://localhost/api/coaching/portal/ask-coach';
const COACH_URL = 'http://localhost/api/admin/coaching/questions';

beforeEach(() => {
  state.claims = null;
  state.entitled = true;
  state.admin = false;
  state.rows = [];
  vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', 'true');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('member route /api/coaching/portal/ask-coach', () => {
  it('returns 401 when logged out, even with the flag off', async () => {
    vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', '');
    expect((await memberGET(req(MEMBER_URL))).status).toBe(401);
    expect((await memberPOST(req(MEMBER_URL, { question: 'How do I quote?' }))).status).toBe(401);
  });

  it('returns 404 for a signed-in member while the flag is off (default)', async () => {
    state.claims = { sub: MEMBER_A };
    for (const value of ['', 'false', '1', 'TRUE ']) {
      vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', value);
      expect((await memberGET(req(MEMBER_URL))).status).toBe(404);
    }
    expect(state.rows).toHaveLength(0);
  });

  it('returns 403 without an active coaching subscription', async () => {
    state.claims = { sub: MEMBER_A };
    state.entitled = false;
    expect((await memberPOST(req(MEMBER_URL, { question: 'Should I lease a van?' }))).status).toBe(
      403
    );
    expect(state.rows).toHaveLength(0);
  });

  it('answers with citations from the coach material', async () => {
    state.claims = { sub: MEMBER_A };
    const res = await memberPOST(
      req(MEMBER_URL, { question: 'How do I stop undercharging when quoting jobs?' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.status).toBe('answered');
    expect(json.result.citations.length).toBeGreaterThan(0);
  });

  it('sends an ungrounded question to the coach, ignoring any userId or coachId in the body', async () => {
    state.claims = { sub: MEMBER_A };
    const res = await memberPOST(
      req(MEMBER_URL, {
        question: 'Should I lease or buy my next van?',
        userId: MEMBER_B,
        coachId: 'coach-someone-else',
      })
    );
    const json = await res.json();
    expect(json.result.status).toBe('sent_to_coach');
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]).toMatchObject({ userId: MEMBER_A, coachId: 'coach-phill-mcgurk' });
  });

  it('a member reads only their own questions', async () => {
    state.claims = { sub: MEMBER_B };
    await memberPOST(req(MEMBER_URL, { question: 'What should I name my second brand?' }));
    state.claims = { sub: MEMBER_A };
    const json = await (await memberGET(req(`${MEMBER_URL}?userId=${MEMBER_B}`))).json();
    expect(json.questions).toEqual([]);
  });

  it('rejects an invalid question with 400', async () => {
    state.claims = { sub: MEMBER_A };
    expect((await memberPOST(req(MEMBER_URL, { question: '' }))).status).toBe(400);
    expect((await memberPOST(req(MEMBER_URL, null))).status).toBe(400);
  });
});

describe('coach route /api/admin/coaching/questions', () => {
  it('returns 401 for non-admins and 404 while the flag is off', async () => {
    expect((await coachGET(req(COACH_URL))).status).toBe(401);
    state.admin = true;
    vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', '');
    expect((await coachGET(req(COACH_URL))).status).toBe(404);
  });

  it('lists open questions and lets the coach answer once', async () => {
    state.claims = { sub: MEMBER_A };
    await memberPOST(req(MEMBER_URL, { question: 'Should I lease or buy my next van?' }));
    state.admin = true;
    const inbox = await (await coachGET(req(COACH_URL))).json();
    expect(inbox.questions).toHaveLength(1);
    const id = inbox.questions[0].id;

    expect((await coachPOST(req(COACH_URL, { id, answer: '' }))).status).toBe(400);
    expect((await coachPOST(req(COACH_URL, { id: 'nope', answer: 'Lease it.' }))).status).toBe(404);
    expect((await coachPOST(req(COACH_URL, { id, answer: 'Buy it outright.' }))).status).toBe(200);
    expect((await coachPOST(req(COACH_URL, { id, answer: 'Again.' }))).status).toBe(409);

    state.admin = false;
    const mine = await (await memberGET(req(MEMBER_URL))).json();
    expect(mine.questions[0]).toMatchObject({
      status: 'answered',
      coachAnswer: 'Buy it outright.',
    });
  });
});
