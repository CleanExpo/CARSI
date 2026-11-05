import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ACTION = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const state = vi.hoisted(() => ({
  admin: false,
  reviewResult: { ok: true as const, status: 'todo' as const },
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: async () => (state.admin ? { sub: 'admin' } : null),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    carsiCoachingAction: {
      findMany: async () => [],
    },
  },
}));

vi.mock('@/lib/server/carsi-coaching-actions-store', () => ({
  reviewProposedCoachingAction: async () => state.reviewResult,
}));

const { GET, POST } = await import('../../../app/api/admin/coaching/proposed-actions/route');

describe('admin proposed-actions route', () => {
  beforeEach(() => {
    state.admin = true;
    state.reviewResult = { ok: true, status: 'todo' };
  });

  it('GET is 401 for non-admin', async () => {
    state.admin = false;
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('POST rejects invalid decision', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/admin/coaching/proposed-actions', {
        method: 'POST',
        body: JSON.stringify({ actionId: ACTION, decision: 'maybe' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('POST rejects malformed uuid', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/admin/coaching/proposed-actions', {
        method: 'POST',
        body: JSON.stringify({ actionId: 'not-a-uuid', decision: 'approve' }),
      })
    );
    expect(res.status).toBe(404);
  });
});
