/**
 * GP-630 (Codex r1 P1): a question a member sent to their coach lives on the action board,
 * but the member must not be able to delete it or rewrite it. Runs the real store over a
 * tiny in-memory stand-in for the Prisma calls it makes; the real-PostgreSQL proof is in
 * carsi-coaching-ask-coach.pg.test.ts (CI E2E job).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { id: string; userId: string; goalId: string | null; title: string; status: string };

const db = vi.hoisted(() => ({ rows: [] as Row[] }));

type Where = Record<string, unknown>;

function matches(row: Row, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Where[]).some((w) => matches(row, w));
    if (key === 'AND') return (cond as Where[]).every((w) => matches(row, w));
    if (key === 'NOT') {
      const list = Array.isArray(cond) ? (cond as Where[]) : [cond as Where];
      return list.every((w) => !matches(row, w));
    }
    const value = row[key as keyof Row];
    if (cond === null) return value === null;
    // Status filters use `{ in: [...] }` (board rows, and GP-634's member-settable set).
    if (typeof cond === 'object' && cond && 'in' in cond) {
      return ((cond as { in: unknown[] }).in ?? []).includes(value);
    }
    if (typeof cond === 'object' && cond && 'startsWith' in cond) {
      return (
        typeof value === 'string' && value.startsWith((cond as { startsWith: string }).startsWith)
      );
    }
    return value === cond;
  });
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    carsiCoachingAction: {
      async deleteMany({ where }: { where: Where }) {
        const before = db.rows.length;
        db.rows = db.rows.filter((r) => !matches(r, where));
        return { count: before - db.rows.length };
      },
      async findFirst({ where }: { where: Where }) {
        return db.rows.find((r) => matches(r, where)) ?? null;
      },
      async update({ where, data }: { where: { id: string }; data: Partial<Row> }) {
        const row = db.rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      async create({ data }: { data: Row }) {
        db.rows.push(data);
        return data;
      },
    },
  },
}));

import {
  deleteCoachingActionForUser,
  upsertCoachingActionForUser,
} from '@/lib/server/carsi-coaching-actions-store';

const MEMBER = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  db.rows = [
    {
      id: 'q1',
      userId: MEMBER,
      goalId: 'ask-coach:coach-phill-mcgurk',
      title: 'Lease or buy?',
      status: 'todo',
    },
    { id: 'a1', userId: MEMBER, goalId: null, title: 'Fix GBP photos', status: 'todo' },
  ];
});

describe('action board rules for questions sent to the coach', () => {
  it('a member cannot delete a question sent to the coach', async () => {
    expect(await deleteCoachingActionForUser(MEMBER, 'q1')).toBe(false);
    expect(db.rows.map((r) => r.id)).toContain('q1');
  });

  it('a member can still delete an ordinary action (control)', async () => {
    expect(await deleteCoachingActionForUser(MEMBER, 'a1')).toBe(true);
    expect(db.rows.map((r) => r.id)).toEqual(['q1']);
  });

  it('a member cannot rewrite or close a question, only add a note', async () => {
    await upsertCoachingActionForUser(MEMBER, {
      id: 'q1',
      title: 'Edited',
      status: 'done',
      progressNote: 'Leaning to lease.',
    });
    expect(db.rows.find((r) => r.id === 'q1')).toMatchObject({
      title: 'Lease or buy?',
      status: 'todo',
      progressNote: 'Leaning to lease.',
    });
  });
});
