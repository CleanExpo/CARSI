/**
 * GP-633 follow-up: only a coach (admin session) can approve or edit a learning path.
 * A member's own LMS session is not an admin session (`isLmsClaimsAllowedAdminPanel`, covered in
 * `lms-admin-db-role-only.test.ts`), so it lands on the `null` branch here.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const MEMBER = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  approve: vi.fn(),
  adjust: vi.fn(),
  assign: vi.fn(),
  view: vi.fn(),
  members: vi.fn(),
  isMember: vi.fn(),
}));

vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: mocks.session }));
vi.mock('@/lib/server/carsi-coaching-learning-path', () => ({
  approveLearningPath: mocks.approve,
  adjustLearningPath: mocks.adjust,
  assignLearningPathFromAssessment: mocks.assign,
  getCoachLearningPathView: mocks.view,
  listCoachingLearningMembers: mocks.members,
  isCoachingMember: mocks.isMember,
}));

const { GET, POST } = await import('../../../app/api/admin/coaching/learning-path/route');

function post(body: unknown) {
  return new NextRequest('https://carsi.example.test/api/admin/coaching/learning-path', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isMember.mockResolvedValue(true);
  mocks.view.mockResolvedValue({ hasAssessment: true, gaps: [], path: [], options: [] });
  mocks.approve.mockResolvedValue({ approved: 2 });
});

describe('approval is coach-only', () => {
  it('refuses approve without an admin session and writes nothing', async () => {
    mocks.session.mockResolvedValue(null);
    const res = await POST(post({ userId: MEMBER, op: 'approve' }));
    expect(res.status).toBe(401);
    expect(mocks.approve).not.toHaveBeenCalled();
  });

  it('refuses adjust and assign without an admin session', async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(post({ userId: MEMBER, op: 'adjust', add: [] }))).status).toBe(401);
    expect((await POST(post({ userId: MEMBER, op: 'assign' }))).status).toBe(401);
    expect(mocks.adjust).not.toHaveBeenCalled();
    expect(mocks.assign).not.toHaveBeenCalled();
  });

  it('refuses to show a member’s draft path without an admin session', async () => {
    mocks.session.mockResolvedValue(null);
    const res = await GET(
      new NextRequest(
        `https://carsi.example.test/api/admin/coaching/learning-path?userId=${MEMBER}`
      )
    );
    expect(res.status).toBe(401);
    expect(mocks.view).not.toHaveBeenCalled();
  });

  it('a coach approves the member’s draft path', async () => {
    mocks.session.mockResolvedValue({ email: 'coach@example.test' });
    const res = await POST(post({ userId: MEMBER, op: 'approve' }));
    expect(res.status).toBe(200);
    expect(mocks.approve).toHaveBeenCalledWith(MEMBER);
    expect(await res.json()).toMatchObject({ result: { status: 'approved', approved: 2 } });
  });

  it('approve refuses someone who is not a coaching member', async () => {
    mocks.session.mockResolvedValue({ email: 'coach@example.test' });
    mocks.isMember.mockResolvedValue(false);
    expect((await POST(post({ userId: MEMBER, op: 'approve' }))).status).toBe(404);
    expect(mocks.approve).not.toHaveBeenCalled();
  });
});
