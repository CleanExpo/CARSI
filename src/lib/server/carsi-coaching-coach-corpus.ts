/**
 * GP-631 (Coaching advantage A4) — a coach's own knowledge base: server rules.
 *
 * Storage is injected (`CoachCorpusStore`) so the rules are tested without a database; the
 * Prisma store lives in `carsi-coaching-coach-corpus-store.ts`. Isolation is structural:
 * every store method takes the coach id, and every read and write is scoped to it. The coach
 * id always comes from the session (route) or from the member's own coach (Ask my coach),
 * never from the request body.
 */
import type { CoachKnowledgeBase } from '@/lib/coaching-portal/ask-my-coach';
import {
  COACH_CORPUS_ITEM_MAX,
  COACH_CORPUS_SOURCE_TYPES,
  chunkCorpusText,
  corpusKnowledgeItems,
  heldBackPassageCount,
  isStandardsText,
  validateCorpusInput,
  type CoachCorpusInput,
  type CoachCorpusRecord,
  type CoachCorpusSourceType,
} from '@/lib/coaching-portal/coach-corpus';
import { getCoachKnowledgeBase } from '@/lib/coaching-portal/coach-knowledge-base';
import type { KnowledgeBaseLookup } from '@/lib/server/carsi-coaching-ask-coach';

export interface CoachCorpusStore {
  listItems(coachId: string): Promise<CoachCorpusRecord[]>;
  listApprovedItems(coachId: string): Promise<CoachCorpusRecord[]>;
  countItems(coachId: string): Promise<number>;
  createItem(coachId: string, input: CoachCorpusInput): Promise<CoachCorpusRecord>;
  /** Sets approved_at once; null when the item is not this coach's. */
  approveItem(coachId: string, id: string): Promise<CoachCorpusRecord | null>;
  /** Hard delete; false when the item is not this coach's. */
  deleteItem(coachId: string, id: string): Promise<boolean>;
}

export type CoachCorpusItemView = {
  id: string;
  sourceType: CoachCorpusSourceType;
  sourceTypeLabel: string;
  title: string;
  body: string;
  provenanceUrl: string | null;
  approvedAt: string | null;
  createdAt: string;
  /** Passages the item is quoted in. */
  passageCount: number;
  /** Passages never quoted because they touch certification, CEC or CPD wording. */
  heldBackCount: number;
};

function toView(r: CoachCorpusRecord): CoachCorpusItemView {
  return {
    id: r.id,
    sourceType: r.sourceType,
    sourceTypeLabel: COACH_CORPUS_SOURCE_TYPES[r.sourceType],
    title: r.title,
    body: r.body,
    provenanceUrl: r.provenanceUrl,
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    passageCount: chunkCorpusText(r.body).length,
    heldBackCount: heldBackPassageCount(r.body, r.title),
  };
}

export async function listCoachCorpus(
  store: CoachCorpusStore,
  coachId: string
): Promise<CoachCorpusItemView[]> {
  return (await store.listItems(coachId)).map(toView);
}

export type AddCorpusResult =
  | { status: 'added'; item: CoachCorpusItemView }
  | { status: 'invalid'; error: string }
  | { status: 'refused_standards' }
  | { status: 'limit_reached'; limit: number };

/** New items start unapproved: nothing a coach adds is used until they approve it. */
export async function addCoachCorpusItem(
  store: CoachCorpusStore,
  coachId: string,
  raw: unknown
): Promise<AddCorpusResult> {
  const v = validateCorpusInput(raw);
  if (!v.ok) return { status: 'invalid', error: v.error };
  if (isStandardsText(`${v.value.title}\n\n${v.value.body}`))
    return { status: 'refused_standards' };
  // A coach at the limit removes something first; the store never drops rows on read.
  if ((await store.countItems(coachId)) >= COACH_CORPUS_ITEM_MAX) {
    return { status: 'limit_reached', limit: COACH_CORPUS_ITEM_MAX };
  }
  const row = await store.createItem(coachId, v.value);
  return { status: 'added', item: toView(row) };
}

export async function approveCoachCorpusItem(
  store: CoachCorpusStore,
  coachId: string,
  id: string
): Promise<'approved' | 'not_found'> {
  if (!id) return 'not_found';
  return (await store.approveItem(coachId, id)) ? 'approved' : 'not_found';
}

export async function removeCoachCorpusItem(
  store: CoachCorpusStore,
  coachId: string,
  id: string
): Promise<'removed' | 'not_found'> {
  if (!id) return 'not_found';
  return (await store.deleteItem(coachId, id)) ? 'removed' : 'not_found';
}

export const COACH_CORPUS_SOURCE_ID = 'coach-corpus';

/**
 * The knowledge base Ask my coach uses for one coach. A coach with at least one approved
 * item is grounded on their own material only. A coach with none falls back to the published
 * source (CARSI's coaching programme and resources for the default coach; nothing otherwise).
 */
export function coachKnowledgeBaseFor(
  store: CoachCorpusStore,
  fallback: (coachId: string) => CoachKnowledgeBase | null = getCoachKnowledgeBase
): KnowledgeBaseLookup {
  return async (coachId) => {
    const approved = await store.listApprovedItems(coachId);
    // Defence in depth: never trust the store's scoping alone.
    const own = approved.filter((r) => r.coachId === coachId && r.approvedAt !== null);
    if (own.length === 0) return fallback(coachId);
    return { coachId, sourceId: COACH_CORPUS_SOURCE_ID, items: corpusKnowledgeItems(own) };
  };
}
