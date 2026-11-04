/** GP-629: the monthly review API is coach (admin) only and validates its input. */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  admin: vi.fn(),
  isMember: vi.fn(),
  generate: vi.fn(),
  view: vi.fn(),
  approve: vi.fn(),
  save: vi.fn(),
  discard: vi.fn(),
  Conflict: class MonthlyReviewConflictError extends Error {},
}));
const MonthlyReviewConflictError = mock.Conflict;

vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: mock.admin }));
vi.mock('@/lib/server/carsi-coaching-learning-path', () => ({
  isCoachingMember: mock.isMember,
  listCoachingLearningMembers: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/server/carsi-coaching-monthly-review', () => ({
  generateMonthlyReview: mock.generate,
  getMonthlyReviewView: mock.view,
  approveMonthlyReview: mock.approve,
  saveMonthlyReview: mock.save,
  discardMonthlyReview: mock.discard,
  MonthlyReviewConflictError: mock.Conflict,
}));

const { GET, POST } = await import('../../../app/api/admin/coaching/monthly-review/route');

const USER = '11111111-1111-4111-8111-111111111111';
const URL_BASE = 'http://localhost/api/admin/coaching/monthly-review';

function post(body: unknown) {
  return POST(
    new NextRequest(URL_BASE, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

beforeEach(() => {
  for (const [key, fn] of Object.entries(mock))
    if (key !== 'Conflict') (fn as ReturnType<typeof vi.fn>).mockReset();
  mock.admin.mockResolvedValue({ sub: 'admin' });
  mock.isMember.mockResolvedValue(true);
  mock.view.mockResolvedValue({ status: 'none' });
});

describe('admin monthly review route', () => {
  it('refuses anyone who is not an admin, for reads and writes', async () => {
    mock.admin.mockResolvedValue(null);
    expect((await GET(new NextRequest(`${URL_BASE}?userId=${USER}`))).status).toBe(401);
    expect((await post({ userId: USER, op: 'approve' })).status).toBe(401);
    expect(mock.approve).not.toHaveBeenCalled();
    expect(mock.view).not.toHaveBeenCalled();
  });

  it('rejects a malformed userId and a non-member', async () => {
    expect((await post({ userId: 'nope', op: 'generate' })).status).toBe(400);
    mock.isMember.mockResolvedValue(false);
    expect((await post({ userId: USER, op: 'generate' })).status).toBe(404);
    expect(mock.generate).not.toHaveBeenCalled();
  });

  it('GET for one member refuses a non-member before reading anything (review r1 P1)', async () => {
    mock.isMember.mockResolvedValue(false);
    const res = await GET(new NextRequest(`${URL_BASE}?userId=${USER}`));
    expect(res.status).toBe(404);
    expect(mock.view).not.toHaveBeenCalled();
  });

  it('answers 409 when a draft lost a race to an approval or discard', async () => {
    mock.generate.mockRejectedValue(new MonthlyReviewConflictError('changed'));
    const res = await post({ userId: USER, op: 'generate' });
    expect(res.status).toBe(409);
  });

  it('passes the coach edits through to approve and reports the result', async () => {
    mock.approve.mockResolvedValue({ status: 'approved', published: 3 });
    const edits = { guidance: 'g', actions: [] };
    const res = await post({ userId: USER, op: 'approve', edits });
    expect(res.status).toBe(200);
    expect(mock.approve).toHaveBeenCalledWith(USER, edits);
    expect((await res.json()).result).toEqual({ status: 'approved', published: 3 });
  });

  it('answers 409 when there is nothing to approve and 400 for invalid edits', async () => {
    mock.approve.mockResolvedValue({ status: 'nothing_to_approve' });
    expect((await post({ userId: USER, op: 'approve' })).status).toBe(409);
    mock.save.mockResolvedValue({ status: 'invalid', detail: 'Guidance cannot be empty.' });
    const res = await post({ userId: USER, op: 'save', edits: {} });
    expect(res.status).toBe(400);
    expect((await res.json()).detail).toBe('Guidance cannot be empty.');
  });

  it('rejects an unknown op', async () => {
    expect((await post({ userId: USER, op: 'publish-everything' })).status).toBe(400);
  });
});
