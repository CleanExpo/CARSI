/**
 * GP-631 (Coaching advantage A4) — a coach's own knowledge base, end to end without a database.
 *
 * The ticket's "Done when": a demo coach uploads one transcript and one chapter, approves both,
 * and Ask my coach cites them in an answer. Around that:
 *   (a) an approved item becomes a cited source for that coach's members;
 *   (b) another coach, and another coach's members, can never read it or be answered from it;
 *   (c) a removed item is never used again;
 *   (d) a coach with no approved items falls back to CARSI's published coaching text;
 *   (e) the GP-630 compliance boundary still holds: credential questions go to the coach.
 */
import { describe, expect, it } from 'vitest';

import { getCoachKnowledgeBase } from '@/lib/coaching-portal/coach-knowledge-base';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import { COACH_CORPUS_ITEM_MAX, type CoachCorpusRecord } from '@/lib/coaching-portal/coach-corpus';
import {
  askMyCoach,
  type AskCoachQuestionRecord,
  type AskCoachStore,
} from '@/lib/server/carsi-coaching-ask-coach';
import {
  addCoachCorpusItem,
  approveCoachCorpusItem,
  coachKnowledgeBaseFor,
  listCoachCorpus,
  removeCoachCorpusItem,
  type CoachCorpusStore,
} from '@/lib/server/carsi-coaching-coach-corpus';

const COACH_A = DEFAULT_COACHING_COACH.id;
const COACH_B = 'coach-b';
const MEMBER_OF_A = 'member-of-a';
const MEMBER_OF_B = 'member-of-b';

const TRANSCRIPT = {
  sourceType: 'transcript',
  title: 'Episode 12: pricing carpet jobs',
  provenanceUrl: 'https://example.test/podcast/12',
  body: [
    'Welcome back to the show. Today we talk about pricing carpet cleaning jobs.',
    'When you quote a carpet cleaning job, walk the rooms first and measure the square metres. Price the job on the area and the soiling, never on a guess at the door.',
  ].join('\n\n'),
};

const CHAPTER = {
  sourceType: 'book_chapter',
  title: 'Chapter 3: your first hire',
  body: [
    'Your first hire should take the work you are worst at, not the work you enjoy.',
    'Before you hire a technician, write down the roster for a normal week and the van checklist they will follow every morning.',
  ].join('\n\n'),
};

const PRICING_Q = 'How should I price a carpet cleaning quote?';
const HIRING_Q = 'What should I write before I hire a technician for the van roster?';

/** In-memory corpus store keyed by coach, mirroring the Prisma store's where-clauses. */
function corpusStore(): CoachCorpusStore & { rows: CoachCorpusRecord[] } {
  const rows: CoachCorpusRecord[] = [];
  return {
    rows,
    async listItems(coachId) {
      return rows.filter((r) => r.coachId === coachId);
    },
    async listApprovedItems(coachId) {
      return rows.filter((r) => r.coachId === coachId && r.approvedAt !== null);
    },
    async countItems(coachId) {
      return rows.filter((r) => r.coachId === coachId).length;
    },
    async createItem(coachId, input) {
      const row: CoachCorpusRecord = {
        id: `item-${rows.length + 1}`,
        coachId,
        ...input,
        approvedAt: null,
        createdAt: new Date(),
      };
      rows.push(row);
      return row;
    },
    async approveItem(coachId, id) {
      const row = rows.find((r) => r.id === id && r.coachId === coachId);
      if (!row) return null;
      row.approvedAt ??= new Date();
      return row;
    },
    async deleteItem(coachId, id) {
      const i = rows.findIndex((r) => r.id === id && r.coachId === coachId);
      if (i < 0) return false;
      rows.splice(i, 1);
      return true;
    },
  };
}

/** Ask-coach store where each member belongs to one coach. */
function askStore(): AskCoachStore & { rows: AskCoachQuestionRecord[] } {
  const rows: AskCoachQuestionRecord[] = [];
  const coachOf: Record<string, string> = { [MEMBER_OF_A]: COACH_A, [MEMBER_OF_B]: COACH_B };
  return {
    rows,
    async coachIdForMember(userId) {
      return coachOf[userId] ?? null;
    },
    async createQuestion(userId, { coachId, question }) {
      const row: AskCoachQuestionRecord = {
        id: `q${rows.length + 1}`,
        userId,
        coachId,
        question,
        status: 'todo',
        coachAnswer: null,
        createdAt: new Date(),
        answeredAt: null,
      };
      rows.push(row);
      return row;
    },
    async listQuestionsForMember(userId) {
      return rows.filter((r) => r.userId === userId);
    },
    async listOpenQuestionsForCoach(coachId) {
      return rows.filter((r) => r.coachId === coachId).map((r) => ({ ...r, memberLabel: 'M' }));
    },
    async findQuestionForCoach(coachId, id) {
      return rows.find((r) => r.coachId === coachId && r.id === id) ?? null;
    },
    async saveCoachAnswer() {
      return null;
    },
  };
}

async function addAndApprove(store: CoachCorpusStore, coachId: string, input: unknown) {
  const added = await addCoachCorpusItem(store, coachId, input);
  if (added.status !== 'added') throw new Error(`not added: ${added.status}`);
  expect(await approveCoachCorpusItem(store, coachId, added.item.id)).toBe('approved');
  return added.item.id;
}

describe('ticket Done-when: transcript + chapter, approved, cited', () => {
  it('(a) cites the coach’s own transcript and chapter to that coach’s member', async () => {
    const corpus = corpusStore();
    await addAndApprove(corpus, COACH_A, TRANSCRIPT);
    await addAndApprove(corpus, COACH_A, CHAPTER);
    const kb = coachKnowledgeBaseFor(corpus);

    const pricing = await askMyCoach(askStore(), kb, MEMBER_OF_A, PRICING_Q);
    expect(pricing.status).toBe('answered');
    if (pricing.status !== 'answered') return;
    expect(pricing.citations.map((c) => c.sourceLabel)).toContain(
      'Transcript: Episode 12: pricing carpet jobs'
    );
    expect(pricing.citations[0].sourceHref).toBe('https://example.test/podcast/12');
    expect(pricing.passages[0].text).toContain('measure the square metres');

    const hiring = await askMyCoach(askStore(), kb, MEMBER_OF_A, HIRING_Q);
    expect(hiring.status).toBe('answered');
    if (hiring.status !== 'answered') return;
    expect(hiring.citations.map((c) => c.sourceLabel)).toContain(
      'Book chapter: Chapter 3: your first hire'
    );
  });

  it('an item that is added but not approved is never used', async () => {
    const corpus = corpusStore();
    await addCoachCorpusItem(corpus, COACH_A, TRANSCRIPT);
    // Approved chapter gives the coach a corpus, so the published fallback is not in play.
    await addAndApprove(corpus, COACH_A, CHAPTER);
    const r = await askMyCoach(askStore(), coachKnowledgeBaseFor(corpus), MEMBER_OF_A, PRICING_Q);
    expect(r.status).toBe('sent_to_coach');
  });
});

describe('(b) isolation between coaches', () => {
  it('a member of another coach is never answered from this coach’s material', async () => {
    const corpus = corpusStore();
    await addAndApprove(corpus, COACH_A, TRANSCRIPT);
    const asks = askStore();
    const r = await askMyCoach(asks, coachKnowledgeBaseFor(corpus), MEMBER_OF_B, PRICING_Q);
    expect(r.status).toBe('sent_to_coach');
    // The escalation goes to the member's own coach, not the corpus owner.
    expect(asks.rows[0].coachId).toBe(COACH_B);
  });

  it('another coach cannot list, approve or remove the item', async () => {
    const corpus = corpusStore();
    const added = await addCoachCorpusItem(corpus, COACH_A, TRANSCRIPT);
    if (added.status !== 'added') throw new Error('not added');
    expect(await listCoachCorpus(corpus, COACH_B)).toEqual([]);
    expect(await approveCoachCorpusItem(corpus, COACH_B, added.item.id)).toBe('not_found');
    expect(await removeCoachCorpusItem(corpus, COACH_B, added.item.id)).toBe('not_found');
    expect(corpus.rows).toHaveLength(1);
    expect(corpus.rows[0].approvedAt).toBeNull();
  });

  it('a coach with their own material only ever cites their own', async () => {
    const corpus = corpusStore();
    await addAndApprove(corpus, COACH_A, TRANSCRIPT);
    await addAndApprove(corpus, COACH_B, CHAPTER);
    const kbB = await coachKnowledgeBaseFor(corpus)(COACH_B);
    expect(kbB?.items.every((i) => i.sourceLabel.startsWith('Book chapter'))).toBe(true);
    const r = await askMyCoach(askStore(), coachKnowledgeBaseFor(corpus), MEMBER_OF_B, PRICING_Q);
    expect(r.status).toBe('sent_to_coach');
  });
});

describe('(c) removal', () => {
  it('a removed item stops being used', async () => {
    const corpus = corpusStore();
    const id = await addAndApprove(corpus, COACH_A, TRANSCRIPT);
    await addAndApprove(corpus, COACH_A, CHAPTER);
    const kb = coachKnowledgeBaseFor(corpus);
    expect((await askMyCoach(askStore(), kb, MEMBER_OF_A, PRICING_Q)).status).toBe('answered');

    expect(await removeCoachCorpusItem(corpus, COACH_A, id)).toBe('removed');
    expect((await askMyCoach(askStore(), kb, MEMBER_OF_A, PRICING_Q)).status).toBe('sent_to_coach');
    expect((await listCoachCorpus(corpus, COACH_A)).map((i) => i.title)).toEqual([CHAPTER.title]);
  });
});

describe('(d) fallback to CARSI published text', () => {
  it('a coach with no approved items gets the published knowledge base', async () => {
    const corpus = corpusStore();
    await addCoachCorpusItem(corpus, COACH_A, TRANSCRIPT); // added, never approved
    const kb = await coachKnowledgeBaseFor(corpus)(COACH_A);
    expect(kb).toEqual(getCoachKnowledgeBase(COACH_A));
    expect(kb?.sourceId).toBe('carsi-published-programme-and-resources');
  });

  it('a coach with approved items is grounded on them, not the published text', async () => {
    const corpus = corpusStore();
    await addAndApprove(corpus, COACH_A, TRANSCRIPT);
    const kb = await coachKnowledgeBaseFor(corpus)(COACH_A);
    expect(kb?.sourceId).toBe('coach-corpus');
    expect(kb?.items.every((i) => i.sourceLabel.startsWith('Transcript: '))).toBe(true);
  });

  it('a coach with neither has no knowledge base', async () => {
    expect(await coachKnowledgeBaseFor(corpusStore())(COACH_B)).toBeNull();
  });
});

describe('(e) compliance boundary from GP-630', () => {
  const CEC_BODY = [
    'When you quote a carpet cleaning job, measure the square metres and price the area.',
    'Ask me directly about CEC hours, recertification and CPD for carpet cleaning.',
  ].join('\n\n');

  it.each([
    'Does the carpet cleaning course earn CEC hours?',
    'Will carpet cleaning count toward my recertification?',
    'Is the carpet cleaning course C.E.C. approved?',
    'How many CPD points for carpet cleaning?',
    'Can I get certified in carpet cleaning?',
  ])('sends "%s" to the coach even though the coach’s material mentions it', async (q) => {
    const corpus = corpusStore();
    await addAndApprove(corpus, COACH_A, {
      sourceType: 'transcript',
      title: 'Carpet cleaning course',
      body: CEC_BODY,
    });
    const asks = askStore();
    const r = await askMyCoach(asks, coachKnowledgeBaseFor(corpus), MEMBER_OF_A, q);
    expect(r).toMatchObject({ status: 'sent_to_coach', reason: 'compliance_topic' });
  });

  it('a passage mentioning CEC is never quoted, and the coach is told it is held back', async () => {
    const corpus = corpusStore();
    await addAndApprove(corpus, COACH_A, {
      sourceType: 'transcript',
      title: 'Carpet cleaning course',
      body: CEC_BODY,
    });
    const kb = await coachKnowledgeBaseFor(corpus)(COACH_A);
    expect(kb?.items.some((i) => /CEC|recert|CPD/i.test(i.body))).toBe(false);
    const [view] = await listCoachCorpus(corpus, COACH_A);
    expect(view.heldBackCount).toBe(1);
    expect(view.passageCount).toBe(2);
  });

  it('a topic the coach never wrote about still goes to the coach', async () => {
    const corpus = corpusStore();
    await addAndApprove(corpus, COACH_A, TRANSCRIPT);
    const r = await askMyCoach(
      askStore(),
      coachKnowledgeBaseFor(corpus),
      MEMBER_OF_A,
      'How do I set up payroll for apprentices?'
    );
    expect(r).toMatchObject({ status: 'sent_to_coach', reason: 'no_grounded_source' });
  });

  it('refuses IICRC standard text at ingest and stores nothing', async () => {
    const corpus = corpusStore();
    const excerpt =
      'ANSI/IICRC S500 Section 12.2.1 The restorer shall inspect the structure. ' +
      '12.2.2 The restorer shall document moisture readings. 12.2.3 The restorer shall ' +
      'establish drying goals before equipment is placed. Section 12.3 covers drying equipment ' +
      'placement and monitoring frequency for every affected area of the structure in detail.';
    const r = await addCoachCorpusItem(corpus, COACH_A, {
      sourceType: 'framework',
      title: 'Drying notes',
      body: excerpt,
    });
    expect(r.status).toBe('refused_standards');
    expect(corpus.rows).toHaveLength(0);
  });
});

describe('Codex r1: standards text without its header, and the item limit', () => {
  it('refuses a headerless standards excerpt at the add boundary and stores nothing', async () => {
    const corpus = corpusStore();
    const headerless =
      'Section 12.2.1 The restorer shall inspect the structure. ' +
      '12.2.2 The restorer shall document moisture readings. 12.2.3 The restorer shall ' +
      'establish drying goals before equipment is placed. Section 12.3 covers drying equipment ' +
      'placement and monitoring frequency for every affected area of the structure in detail.';
    const r = await addCoachCorpusItem(corpus, COACH_A, {
      sourceType: 'framework',
      title: 'My drying notes',
      body: headerless,
    });
    expect(r.status).toBe('refused_standards');
    expect(corpus.rows).toHaveLength(0);
  });

  it('refuses headerless clauses interleaved with commentary at the add boundary (Codex r2)', async () => {
    const corpus = corpusStore();
    const body = [
      'Section 12.2.1 The restorer shall inspect the structure before work starts.',
      'That one matters on every job, so walk the whole house with the owner first.',
      'Section 12.2.2 The restorer shall document moisture readings in each room.',
      'I keep the readings on my phone so the owner can see them on the spot.',
      'Section 12.2.3 The restorer shall establish drying goals before equipment is placed.',
    ].join('\n\n');
    const r = await addCoachCorpusItem(corpus, COACH_A, {
      sourceType: 'transcript',
      title: 'Episode 14',
      body,
    });
    expect(r.status).toBe('refused_standards');
    expect(corpus.rows).toHaveLength(0);
  });

  it('refuses to add past the per-coach limit instead of silently dropping material', async () => {
    const corpus = corpusStore();
    for (let i = 0; i < COACH_CORPUS_ITEM_MAX; i += 1) {
      corpus.rows.push({
        id: `seed-${i}`,
        coachId: COACH_A,
        sourceType: 'sop',
        title: `SOP ${i}`,
        body: TRANSCRIPT.body,
        provenanceUrl: null,
        approvedAt: new Date(),
        createdAt: new Date(),
      });
    }
    const r = await addCoachCorpusItem(corpus, COACH_A, TRANSCRIPT);
    expect(r.status).toBe('limit_reached');
    expect(corpus.rows).toHaveLength(COACH_CORPUS_ITEM_MAX);
    // Another coach is not affected by this coach's count.
    expect((await addCoachCorpusItem(corpus, COACH_B, TRANSCRIPT)).status).toBe('added');
  });
});

describe('ingest validation', () => {
  it('returns invalid with a reason and stores nothing', async () => {
    const corpus = corpusStore();
    const r = await addCoachCorpusItem(corpus, COACH_A, { sourceType: 'transcript', title: 'x' });
    expect(r.status).toBe('invalid');
    expect(corpus.rows).toHaveLength(0);
  });
});
