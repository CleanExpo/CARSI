/**
 * GP-631 coach knowledge base on a REAL PostgreSQL (CI's E2E job, `npm run test:pg`).
 *
 * Runs the production Prisma store against the migrated `carsi_coaching_coach_corpus` table and
 * proves every read and write is scoped to the coach:
 *   - another coach cannot list, approve or delete an item;
 *   - an unapproved item is not returned to Ask my coach; once approved it is;
 *   - approving twice keeps the first approval time;
 *   - a deleted item is gone, and a non-UUID id is not found rather than an error.
 * Cleans up after itself. Locally it is skipped without a local DATABASE_URL; in CI it must run.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const IN_CI = process.env.CI === 'true';
const HOST = (() => {
  try {
    return DB_URL ? new URL(DB_URL).hostname : '';
  } catch {
    return '';
  }
})();
const RUNNABLE = Boolean(DB_URL) && ['localhost', '127.0.0.1', '::1'].includes(HOST);

if (!RUNNABLE) {
  describe('coach knowledge base (real PostgreSQL)', () => {
    if (IN_CI) {
      it('must run in CI: needs DATABASE_URL pointing at the local migrated postgres service', () => {
        throw new Error(`CI=true but no usable local DATABASE_URL (host: "${HOST || 'none'}").`);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('coach knowledge base (real PostgreSQL)', async () => {
  const { prisma } = await import('@/lib/prisma');
  const { prismaCoachCorpusStore: store } =
    await import('@/lib/server/carsi-coaching-coach-corpus-store');
  const rules = await import('@/lib/server/carsi-coaching-coach-corpus');

  const COACH_A = `gp631-a-${randomUUID().slice(0, 8)}`;
  const COACH_B = `gp631-b-${randomUUID().slice(0, 8)}`;
  const INPUT = {
    sourceType: 'transcript',
    title: 'Episode 12: pricing carpet jobs',
    body: 'When you quote a carpet cleaning job, walk the rooms first and measure the square metres.',
  };

  afterAll(async () => {
    await prisma.carsiCoachingCoachCorpusItem.deleteMany({
      where: { coachId: { in: [COACH_A, COACH_B] } },
    });
  });

  it('scopes every read and write to the owning coach', async () => {
    const added = await rules.addCoachCorpusItem(store, COACH_A, INPUT);
    expect(added.status).toBe('added');
    if (added.status !== 'added') return;
    const id = added.item.id;

    expect(await store.listItems(COACH_B)).toEqual([]);
    expect(await store.approveItem(COACH_B, id)).toBeNull();
    expect(await store.deleteItem(COACH_B, id)).toBe(false);
    expect(await store.listApprovedItems(COACH_A)).toEqual([]);

    const first = await store.approveItem(COACH_A, id);
    expect(first?.approvedAt).toBeInstanceOf(Date);
    const again = await store.approveItem(COACH_A, id);
    expect(again?.approvedAt?.getTime()).toBe(first?.approvedAt?.getTime());

    expect((await store.listApprovedItems(COACH_A)).map((r) => r.id)).toEqual([id]);
    expect(await store.listApprovedItems(COACH_B)).toEqual([]);
    const kb = await rules.coachKnowledgeBaseFor(store, () => null)(COACH_A);
    expect(kb?.items[0]?.sourceLabel).toBe('Transcript: Episode 12: pricing carpet jobs');

    expect(await store.deleteItem(COACH_A, id)).toBe(true);
    expect(await store.listItems(COACH_A)).toEqual([]);
  });

  it('treats a non-UUID id as not found', async () => {
    expect(await store.approveItem(COACH_A, 'not-a-uuid')).toBeNull();
    expect(await store.deleteItem(COACH_A, 'not-a-uuid')).toBe(false);
  });
});
