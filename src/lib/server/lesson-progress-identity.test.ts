import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ claims: vi.fn(), upstream: vi.fn(), admin: vi.fn(), grant: vi.fn(),
  course: vi.fn(), context: vi.fn(), patch: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: mocks.upstream }));
vi.mock('@/lib/admin/admin-panel-access', () => ({ isLmsClaimsAllowedAdminPanel: mocks.admin }));
vi.mock('@/lib/server/enrollment-service', () => ({ ensureAdminEnrollmentForCourse: mocks.grant,
  getCourseIdForLesson: mocks.course, getLessonContextForStudent: mocks.context, patchLessonProgress: mocks.patch }));
import { PATCH } from '../../../app/api/lms/lessons/[lessonId]/progress/route';

const studentId = '10000000-0000-4000-8000-000000000001';
const lessonId = '10000000-0000-4000-8000-000000000002';
const ctx = { params: Promise.resolve({ lessonId }) };
function request(identity: string | null) {
  return new NextRequest('http://localhost/progress', { method: 'PATCH', body: '{"completed":true}',
    headers: identity === null ? {} : { 'x-carsi-learner-id': identity } });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.claims.mockResolvedValue({ sub: studentId }); mocks.upstream.mockReturnValue(null); mocks.admin.mockReturnValue(false);
  mocks.course.mockResolvedValue('course'); mocks.context.mockResolvedValue({ lesson: { id: lessonId, module: { courseId: 'course' } }, enrollmentId: 'enrolment' });
  mocks.fetch.mockResolvedValue(new Response('{"proxy":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('progress expected learner identity', () => {
  it.each(['', 'foreign'])('rejects supplied mismatch %s before bootstrap, progress or proxy effects', async (identity) => {
    mocks.admin.mockReturnValue(true); mocks.upstream.mockReturnValue('https://synthetic.invalid');
    expect((await PATCH(request(identity), ctx)).status).toBe(401);
    expect(mocks.grant).not.toHaveBeenCalled(); expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.context).not.toHaveBeenCalled();
  });
  it('rejects expired bound identity before effects', async () => {
    mocks.claims.mockResolvedValue(null);
    expect((await PATCH(request(studentId), ctx)).status).toBe(401);
    expect(mocks.patch).not.toHaveBeenCalled();
  });
  it('fails bound upstream progress closed after verifying identity', async () => {
    mocks.upstream.mockReturnValue('https://synthetic.invalid');
    const res = await PATCH(request(studentId), ctx);
    expect(res.status).toBe(503); expect(res.headers.get('cache-control')).toBe('no-store');
    expect(mocks.claims).toHaveBeenCalledTimes(1); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('retains valid bound local completion behaviour', async () => {
    const res = await PATCH(request(studentId), ctx);
    expect(res.status).toBe(200); expect(await res.json()).toEqual({ ok: true });
    expect(mocks.patch).toHaveBeenCalledExactlyOnceWith({ studentId, lessonId, enrollmentId: 'enrolment', courseId: 'course', completed: true });
    expect(mocks.claims).toHaveBeenCalledTimes(1);
  });
  it('preserves headerless legacy upstream proxy without local claims access', async () => {
    mocks.upstream.mockReturnValue('https://synthetic.invalid');
    expect((await PATCH(request(null), ctx)).status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledTimes(1); expect(mocks.claims).not.toHaveBeenCalled();
    expect(mocks.patch).not.toHaveBeenCalled();
  });
  it('preserves headerless local administrator bootstrap and completion', async () => {
    mocks.admin.mockReturnValue(true);
    expect((await PATCH(request(null), ctx)).status).toBe(200);
    expect(mocks.grant).toHaveBeenCalledExactlyOnceWith({ sub: studentId }, 'course');
    expect(mocks.patch).toHaveBeenCalledTimes(1);
  });
});
