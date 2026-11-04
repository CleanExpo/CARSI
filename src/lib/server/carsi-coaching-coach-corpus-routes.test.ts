/**
 * GP-631 — drives the real coach knowledge-base route handlers and the real member Ask my coach
 * route, with auth and storage mocked.
 * Proves: (f) 401 when logged out (before the flag), 404 while the flag is off, and that the
 * coach is always the session's coach: a request body cannot name another coach. The member
 * route answers from the coach's approved material once it exists.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CoachCorpusRecord } from '@/lib/coaching-portal/coach-corpus';
import type { AskCoachStore } from '@/lib/server/carsi-coaching-ask-coach';
import type { CoachCorpusStore } from '@/lib/server/carsi-coaching-coach-corpus';

const MEMBER = '11111111-1111-4111-8111-111111111111';

const state = vi.hoisted(() => ({
  claims: null as { sub: string; email: string; full_name: string; role: string } | null,
  admin: false,
  corpus: [] as CoachCorpusRecord[],
  questions: 0,
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => state.claims,
}));

vi.mock('@/lib/server/carsi-coaching-subscription-store', () => ({
  getCoachingPortalRowForUser: async () => ({
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
  }),
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: async () => (state.admin ? { sub: 'admin' } : null),
}));

vi.mock('@/lib/server/carsi-coaching-coach-corpus-store', () => {
  const store: CoachCorpusStore = {
    async listItems(coachId) {
      return state.corpus.filter((r) => r.coachId === coachId);
    },
    async listApprovedItems(coachId) {
      return state.corpus.filter((r) => r.coachId === coachId && r.approvedAt !== null);
    },
    async createItem(coachId, input) {
      const row: CoachCorpusRecord = {
        id: `item-${state.corpus.length + 1}`,
        coachId,
        ...input,
        approvedAt: null,
        createdAt: new Date(),
      };
      state.corpus.push(row);
      return row;
    },
    async approveItem(coachId, id) {
      const row = state.corpus.find((r) => r.id === id && r.coachId === coachId);
      if (!row) return null;
      row.approvedAt ??= new Date();
      return row;
    },
    async deleteItem(coachId, id) {
      const i = state.corpus.findIndex((r) => r.id === id && r.coachId === coachId);
      if (i < 0) return false;
      state.corpus.splice(i, 1);
      return true;
    },
  };
  return { getCoachCorpusStore: () => store };
});

vi.mock('@/lib/server/carsi-coaching-ask-coach-store', () => {
  const store: AskCoachStore = {
    async coachIdForMember() {
      return 'coach-phill-mcgurk';
    },
    async createQuestion(userId, input) {
      state.questions += 1;
      return {
        id: `q${state.questions}`,
        userId,
        coachId: input.coachId,
        question: input.question,
        status: 'todo',
        coachAnswer: null,
        createdAt: new Date(),
        answeredAt: null,
      };
    },
    async listQuestionsForMember() {
      return [];
    },
    async listOpenQuestionsForCoach() {
      return [];
    },
    async findQuestionForCoach() {
      return null;
    },
    async saveCoachAnswer() {
      return null;
    },
  };
  return { getAskCoachStore: () => store };
});

import { POST as memberPOST } from '../../../app/api/coaching/portal/ask-coach/route';
import {
  DELETE as itemDELETE,
  PATCH as itemPATCH,
} from '../../../app/api/admin/coaching/corpus/[id]/route';
import { GET as corpusGET, POST as corpusPOST } from '../../../app/api/admin/coaching/corpus/route';

const CORPUS_URL = 'http://localhost/api/admin/coaching/corpus';
const MEMBER_URL = 'http://localhost/api/coaching/portal/ask-coach';

const TRANSCRIPT = {
  sourceType: 'transcript',
  title: 'Episode 12: pricing carpet jobs',
  body: 'When you quote a carpet cleaning job, walk the rooms first and measure the square metres. Price the job on the area and the soiling.',
};

function req(url: string, method = 'GET', body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  state.claims = null;
  state.admin = false;
  state.corpus = [];
  state.questions = 0;
  vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', 'true');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('(f) coach knowledge-base routes: sign-in, then flag', () => {
  it('returns 401 for every method when logged out, even with the flag off', async () => {
    vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', '');
    expect((await corpusGET()).status).toBe(401);
    expect((await corpusPOST(req(CORPUS_URL, 'POST', TRANSCRIPT))).status).toBe(401);
    expect(
      (await itemPATCH(req(`${CORPUS_URL}/x`, 'PATCH', { action: 'approve' }), ctx('x'))).status
    ).toBe(401);
    expect((await itemDELETE(req(`${CORPUS_URL}/x`, 'DELETE'), ctx('x'))).status).toBe(401);
  });

  it.each(['', 'false', 'TRUE', '1'])('returns 404 for a coach while the flag is %j', async (v) => {
    vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', v);
    state.admin = true;
    expect((await corpusGET()).status).toBe(404);
    expect((await corpusPOST(req(CORPUS_URL, 'POST', TRANSCRIPT))).status).toBe(404);
    expect(
      (await itemPATCH(req(`${CORPUS_URL}/x`, 'PATCH', { action: 'approve' }), ctx('x'))).status
    ).toBe(404);
    expect((await itemDELETE(req(`${CORPUS_URL}/x`, 'DELETE'), ctx('x'))).status).toBe(404);
    expect(state.corpus).toHaveLength(0);
  });

  it('a signed-in member who is not a coach gets 401 from the coach routes', async () => {
    state.claims = { sub: MEMBER, email: 'm@example.test', full_name: 'M', role: 'student' };
    expect((await corpusGET()).status).toBe(401);
  });
});

describe('coach knowledge-base routes with the flag on', () => {
  it('adds, approves and removes an item for the session coach only', async () => {
    state.admin = true;
    const added = await corpusPOST(
      req(CORPUS_URL, 'POST', { ...TRANSCRIPT, coachId: 'someone-else' })
    );
    expect(added.status).toBe(200);
    expect(state.corpus).toHaveLength(1);
    expect(state.corpus[0].coachId).toBe('coach-phill-mcgurk');
    const id = state.corpus[0].id;

    const approved = await itemPATCH(
      req(`${CORPUS_URL}/${id}`, 'PATCH', { action: 'approve' }),
      ctx(id)
    );
    expect(approved.status).toBe(200);
    expect(state.corpus[0].approvedAt).not.toBeNull();

    const list = (await (await corpusGET()).json()) as {
      items: { id: string; approvedAt: string | null }[];
    };
    expect(list.items.map((i) => i.id)).toEqual([id]);
    expect(list.items[0].approvedAt).not.toBeNull();

    expect((await itemDELETE(req(`${CORPUS_URL}/${id}`, 'DELETE'), ctx(id))).status).toBe(200);
    expect(state.corpus).toHaveLength(0);
  });

  it('cannot approve or remove another coach’s item', async () => {
    state.admin = true;
    state.corpus.push({
      id: 'other',
      coachId: 'coach-b',
      sourceType: 'sop',
      title: 'Other coach SOP',
      body: TRANSCRIPT.body,
      provenanceUrl: null,
      approvedAt: null,
      createdAt: new Date(),
    });
    expect(
      (await itemPATCH(req(`${CORPUS_URL}/other`, 'PATCH', { action: 'approve' }), ctx('other')))
        .status
    ).toBe(404);
    expect((await itemDELETE(req(`${CORPUS_URL}/other`, 'DELETE'), ctx('other'))).status).toBe(404);
    expect(state.corpus[0].approvedAt).toBeNull();
    const list = (await (await corpusGET()).json()) as { items: unknown[] };
    expect(list.items).toEqual([]);
  });

  it('rejects invalid input with 400 and standards text with 422', async () => {
    state.admin = true;
    expect((await corpusPOST(req(CORPUS_URL, 'POST', { title: 'x' }))).status).toBe(400);
    const excerpt =
      'ANSI/IICRC S500 Section 12.2.1 The restorer shall inspect the structure. ' +
      '12.2.2 The restorer shall document moisture readings. 12.2.3 The restorer shall ' +
      'establish drying goals before equipment is placed. Section 12.3 covers drying equipment ' +
      'placement and monitoring frequency for every affected area of the structure in detail.';
    const r = await corpusPOST(
      req(CORPUS_URL, 'POST', { sourceType: 'sop', title: 'Notes', body: excerpt })
    );
    expect(r.status).toBe(422);
    expect(state.corpus).toHaveLength(0);
    expect(
      (await itemPATCH(req(`${CORPUS_URL}/x`, 'PATCH', { action: 'other' }), ctx('x'))).status
    ).toBe(400);
  });
});

describe('member Ask my coach route grounds on the coach’s approved material', () => {
  it('cites the approved transcript, and not before it is approved', async () => {
    state.claims = { sub: MEMBER, email: 'm@example.test', full_name: 'M', role: 'student' };
    state.corpus.push({
      id: 'item-1',
      coachId: 'coach-phill-mcgurk',
      sourceType: 'transcript',
      title: TRANSCRIPT.title,
      body: TRANSCRIPT.body,
      provenanceUrl: null,
      approvedAt: null,
      createdAt: new Date(),
    });
    const question = { question: 'How should I price a carpet cleaning quote?' };

    const before = (await (await memberPOST(req(MEMBER_URL, 'POST', question))).json()) as {
      result: { status: string; citations?: { sourceLabel: string }[] };
    };
    // Unapproved: the coach has no corpus yet, so only the published fallback may answer.
    expect(JSON.stringify(before.result)).not.toContain('Transcript:');

    state.corpus[0].approvedAt = new Date();
    const after = (await (await memberPOST(req(MEMBER_URL, 'POST', question))).json()) as {
      result: { status: string; citations: { sourceLabel: string }[] };
    };
    expect(after.result.status).toBe('answered');
    expect(after.result.citations[0].sourceLabel).toBe(
      'Transcript: Episode 12: pricing carpet jobs'
    );
  });

  it('returns 404 to a member while the flag is off', async () => {
    vi.stubEnv('CARSI_COACHING_ASSISTANT_ENABLED', '');
    state.claims = { sub: MEMBER, email: 'm@example.test', full_name: 'M', role: 'student' };
    expect(
      (await memberPOST(req(MEMBER_URL, 'POST', { question: 'How do I quote?' }))).status
    ).toBe(404);
  });
});
