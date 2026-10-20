import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(async (): Promise<unknown[]> => []),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { lmsCourse: { findMany } } }));
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(async () => ({ sub: 'u1', role: 'student' })),
}));

import { GET } from '../../../app/api/lms/search/route';
import { getCecApprovalEntries } from '@/lib/seed/cec-approvals';

// GP-653: course search must not keep advertising CEC hours for a lapsed approval.
const EARLIEST = [...getCecApprovalEntries()]
  .filter((e) => e.status === 'approved' && e.expiresAt)
  .sort((a, b) => String(a.expiresAt).localeCompare(String(b.expiresAt)))[0];
const EXPIRES = new Date(`${EARLIEST.expiresAt}T00:00:00Z`);

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue([
    {
      id: 'c1',
      slug: EARLIEST.slug,
      title: EARLIEST.slug,
      category: null,
      meta: null,
      iicrcDiscipline: null,
    },
  ]);
  process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:5432/test';
});

afterEach(() => {
  vi.useRealTimers();
});

async function searchCecAt(now: Date): Promise<unknown> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const res = await GET(new NextRequest('http://localhost/api/lms/search?q=introduction'));
  const body = (await res.json()) as { items: { cec_hours: unknown }[] };
  return body.items[0]?.cec_hours;
}

describe('course search CEC hours follow approval expiry (GP-653)', () => {
  it('shows the approved hours the day before the approval lapses', async () => {
    expect(await searchCecAt(new Date(EXPIRES.getTime() - 24 * 3600 * 1000))).toBeTruthy();
  });

  it('shows no CEC hours once the approval has lapsed', async () => {
    expect(await searchCecAt(new Date(EXPIRES.getTime() + 1000))).toBeNull();
  });
});
