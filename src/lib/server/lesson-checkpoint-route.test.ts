import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { CheckpointError } from '@/lib/lms/lesson-checkpoint';

const mocks = vi.hoisted(() => ({
  claims: vi.fn(), upstream: vi.fn(), get: vi.fn(), save: vi.fn(),
  lessonFindUnique: vi.fn(), courseFindUnique: vi.fn(), courseFindMany: vi.fn(),
  enrolFindUnique: vi.fn(), enrolFindMany: vi.fn(),
}));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: mocks.upstream }));
// Only the prerequisite adapter (DECISIONS #41) touches Prisma in the route itself.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsLesson: { findUnique: mocks.lessonFindUnique },
    lmsCourse: { findUnique: mocks.courseFindUnique, findMany: mocks.courseFindMany },
    lmsEnrollment: { findUnique: mocks.enrolFindUnique, findMany: mocks.enrolFindMany },
  },
}));
vi.mock('@/lib/server/lesson-checkpoint', async (original) => ({
  ...(await original<typeof import('./lesson-checkpoint')>()), getLessonCheckpoint: mocks.get, saveLessonCheckpoint: mocks.save,
}));
import { GET, PATCH } from '../../../app/api/lms/lessons/[lessonId]/checkpoint/route';

const studentId = '10000000-0000-4000-8000-000000000001';
const lessonId = '10000000-0000-4000-8000-000000000002';
const ctx = { params: Promise.resolve({ lessonId }) };
const draft = { expectedRevision: 0, contentVersion: 'a'.repeat(64), position: { kind: 'reading', value: 0 }, answers: {} };
function request(body?: string) {
  return new NextRequest('http://localhost/api/lms/lessons/' + lessonId + '/checkpoint',
    body === undefined ? { headers: { 'x-carsi-learner-id': studentId } }
      : { method: 'PATCH', body, headers: { 'x-carsi-learner-id': studentId } });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  mocks.upstream.mockReturnValue(null); mocks.claims.mockResolvedValue({ sub: studentId, role: 'admin' });
  mocks.get.mockResolvedValue({ revision: 0 }); mocks.save.mockResolvedValue({ revision: 1 });
  mocks.lessonFindUnique.mockResolvedValue({ module: { courseId: 'course-1' } });
  mocks.courseFindUnique.mockResolvedValue({ slug: 'plain-course', meta: null });
});
afterEach(() => vi.unstubAllEnvs());

describe('dedicated checkpoint route', () => {
  it('uses only session identity and never creates an administrator grant', async () => {
    const res = await GET(request(), ctx);
    expect(res.status).toBe(200); expect(res.headers.get('cache-control')).toBe('no-store');
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith(studentId, lessonId);
  });
  it('parses strict PATCH and returns acknowledgement', async () => {
    const res = await PATCH(request(JSON.stringify(draft)), ctx);
    expect(res.status).toBe(200); expect(await res.json()).toEqual({ revision: 1 });
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith(studentId, lessonId, draft);
  });
  it('rejects unauthenticated requests', async () => {
    mocks.claims.mockResolvedValue(null);
    expect((await GET(request(), ctx)).status).toBe(401);
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it.each([null, '', 'another-learner'])('rejects absent or mismatched expected identity %s before service access', async (header) => {
    const req = request();
    if (header === null) req.headers.delete('x-carsi-learner-id');
    else req.headers.set('x-carsi-learner-id', header);
    const result = await GET(req, ctx);
    expect(result.status).toBe(401);
    expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('fails upstream mode closed without local services', async () => {
    mocks.upstream.mockReturnValue('https://synthetic.invalid');
    expect((await PATCH(request(JSON.stringify(draft)), ctx)).status).toBe(503);
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.claims).not.toHaveBeenCalled();
  });
  it.each(['{', '{}', JSON.stringify({ ...draft, studentId }), ' '.repeat(65537)])('rejects invalid or oversized body %#', async (body) => {
    const res = await PATCH(request(body), ctx);
    expect(res.status).toBe(400); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('bounds streamed bytes even when Content-Length lies', async () => {
    const req = request(' '.repeat(65537)); req.headers.set('content-length', '1');
    expect((await PATCH(req, ctx)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([400, 404, 409, 503] as const)('returns generic no-store error %s', async (status) => {
    mocks.get.mockRejectedValue(new CheckpointError(status));
    const res = await GET(request(), ctx);
    expect(res.status).toBe(status); expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.text()).not.toContain('postgresql');
  });
  it('hides unknown infrastructure errors', async () => {
    mocks.get.mockRejectedValue(new Error('private password and database host'));
    const res = await GET(request(), ctx);
    expect(res.status).toBe(503); expect(await res.text()).toBe('{"detail":"Checkpoint unavailable"}');
  });
});

describe('checkpoint route — prerequisite gate (DECISIONS #41)', () => {
  const L2 = 'level-2-mould-remediation-30ee3492';
  beforeEach(() => {
    mocks.claims.mockResolvedValue({ sub: studentId, role: 'student' });
    mocks.courseFindUnique.mockResolvedValue({
      slug: 'mould-remediation-fundamentals',
      meta: { prerequisites: [{ courseSlug: L2 }], prerequisitesEnforcedFrom: '2026-11-02T00:00:00+11:00' },
    });
    mocks.enrolFindUnique.mockResolvedValue({
      status: 'active', enrolledAt: new Date('2026-11-10T00:00:00Z'), paymentReference: 'free',
    });
    mocks.courseFindMany.mockResolvedValue([{ id: 'course-l2', slug: L2, title: 'Level 2 — Mould Remediation' }]);
    mocks.enrolFindMany.mockResolvedValue([]);
  });

  it('GET refuses (403) a post-gate enrolment without the prerequisite and serves no content', async () => {
    const res = await GET(request(), ctx);
    const body = (await res.json()) as { code?: string; prerequisites?: { slug: string }[] };
    expect(res.status).toBe(403); expect(res.headers.get('cache-control')).toBe('no-store');
    expect(body.code).toBe('prerequisite_not_met'); expect(body.prerequisites?.[0]?.slug).toBe(L2);
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it('PATCH refuses (403) and records nothing', async () => {
    const res = await PATCH(request(JSON.stringify(draft)), ctx);
    expect(res.status).toBe(403); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('passes once the prerequisite is completed', async () => {
    mocks.enrolFindMany.mockResolvedValue([{ courseId: 'course-l2' }]);
    expect((await GET(request(), ctx)).status).toBe(200);
    expect((await PATCH(request(JSON.stringify(draft)), ctx)).status).toBe(200);
  });
  it('a grandfathered (pre-gate) enrolment passes', async () => {
    mocks.enrolFindUnique.mockResolvedValue({
      status: 'active', enrolledAt: new Date('2026-10-01T00:00:00Z'), paymentReference: 'cs_old',
    });
    expect((await GET(request(), ctx)).status).toBe(200);
  });
  it('an admin bypasses the gate', async () => {
    mocks.claims.mockResolvedValue({ sub: studentId, role: 'admin' });
    expect((await PATCH(request(JSON.stringify(draft)), ctx)).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it('a gate lookup failure fails closed (503), never through to the content', async () => {
    mocks.enrolFindMany.mockRejectedValue(new Error('db down'));
    expect((await GET(request(), ctx)).status).toBe(503);
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
