/**
 * GP-631 — Prisma store for a coach's own knowledge base (`carsi_coaching_coach_corpus`).
 *
 * Every query is scoped by coach id in its WHERE clause, including approve and delete, so one
 * coach can never read, approve or remove another coach's material by guessing an id.
 * Reads are not capped: the per-coach item limit is enforced when adding
 * (COACH_CORPUS_ITEM_MAX), so a read never silently drops an item (Codex r1).
 */
import {
  isCoachCorpusSourceType,
  type CoachCorpusRecord,
} from '@/lib/coaching-portal/coach-corpus';
import { prisma } from '@/lib/prisma';
import type { CoachCorpusStore } from '@/lib/server/carsi-coaching-coach-corpus';
import { isUuidParam } from '@/lib/server/uuid-param';

const SELECT = {
  id: true,
  coachId: true,
  sourceType: true,
  title: true,
  body: true,
  provenanceUrl: true,
  approvedAt: true,
  createdAt: true,
} as const;

type Row = {
  id: string;
  coachId: string;
  sourceType: string;
  title: string;
  body: string;
  provenanceUrl: string | null;
  approvedAt: Date | null;
  createdAt: Date;
};

/** A row with an unknown source type is skipped rather than guessed. */
function toRecords(rows: Row[]): CoachCorpusRecord[] {
  return rows.flatMap((r) =>
    isCoachCorpusSourceType(r.sourceType) ? [{ ...r, sourceType: r.sourceType }] : []
  );
}

export const prismaCoachCorpusStore: CoachCorpusStore = {
  async listItems(coachId) {
    const rows = await prisma.carsiCoachingCoachCorpusItem.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    });
    return toRecords(rows);
  },

  async listApprovedItems(coachId) {
    const rows = await prisma.carsiCoachingCoachCorpusItem.findMany({
      where: { coachId, approvedAt: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: SELECT,
    });
    return toRecords(rows);
  },

  async countItems(coachId) {
    return prisma.carsiCoachingCoachCorpusItem.count({ where: { coachId } });
  },

  async createItem(coachId, input) {
    const row = await prisma.carsiCoachingCoachCorpusItem.create({
      data: { coachId, ...input },
      select: SELECT,
    });
    const [record] = toRecords([row]);
    return record;
  },

  async approveItem(coachId, id) {
    // Ids are UUIDs; anything else cannot match a row, and would make Postgres throw.
    if (!isUuidParam(id)) return null;
    // Conditional: the first approval time stands; re-approving changes nothing.
    await prisma.carsiCoachingCoachCorpusItem.updateMany({
      where: { id, coachId, approvedAt: null },
      data: { approvedAt: new Date() },
    });
    const row = await prisma.carsiCoachingCoachCorpusItem.findFirst({
      where: { id, coachId },
      select: SELECT,
    });
    return row ? (toRecords([row])[0] ?? null) : null;
  },

  async deleteItem(coachId, id) {
    if (!isUuidParam(id)) return false;
    const { count } = await prisma.carsiCoachingCoachCorpusItem.deleteMany({
      where: { id, coachId },
    });
    return count > 0;
  },
};

export function getCoachCorpusStore(): CoachCorpusStore {
  return prismaCoachCorpusStore;
}
