/**
 * GP-633 follow-up: only a coach (admin session) can read or edit the gap-to-course map.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const COURSE = 'aaaaaaaa-0000-4000-8000-000000000004';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  view: vi.fn(),
  save: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: mocks.session }));
vi.mock('@/lib/server/carsi-coaching-gap-map', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/server/carsi-coaching-gap-map')>();
  return {
    GapMapValidationError: real.GapMapValidationError,
    getGapMapView: mocks.view,
    saveGapMapEntry: mocks.save,
    resetGapMapEntry: mocks.reset,
  };
});

const { GapMapValidationError } = await import('@/lib/server/carsi-coaching-gap-map');
const { GET, POST } = await import('../../../app/api/admin/coaching/gap-map/route');

function post(body: unknown) {
  return new NextRequest('https://carsi.example.test/api/admin/coaching/gap-map', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const SAVE = {
  op: 'save',
  chapterSlug: 'carsi-business-coaching',
  area: 'marketing',
  courseIds: [COURSE],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.view.mockResolvedValue({ chapters: [], options: [] });
  mocks.save.mockResolvedValue({ chapters: [], options: [] });
  mocks.reset.mockResolvedValue({ chapters: [], options: [] });
});

describe('gap map route is coach-only', () => {
  it('refuses to read the map without an admin session', async () => {
    mocks.session.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(mocks.view).not.toHaveBeenCalled();
  });

  it('refuses to save or reset without an admin session and writes nothing', async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(post(SAVE))).status).toBe(401);
    expect((await POST(post({ ...SAVE, op: 'reset' }))).status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it('a coach saves an area', async () => {
    mocks.session.mockResolvedValue({ email: 'coach@example.test' });
    const res = await POST(post(SAVE));
    expect(res.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith({
      chapterSlug: 'carsi-business-coaching',
      area: 'marketing',
      courseIds: [COURSE],
    });
  });

  it('a coach resets an area to the default', async () => {
    mocks.session.mockResolvedValue({ email: 'coach@example.test' });
    const res = await POST(
      post({ op: 'reset', chapterSlug: 'carsi-business-coaching', area: 'sales' })
    );
    expect(res.status).toBe(200);
    expect(mocks.reset).toHaveBeenCalledWith({
      chapterSlug: 'carsi-business-coaching',
      area: 'sales',
    });
  });

  it('rejects course ids that are not uuids before touching the store', async () => {
    mocks.session.mockResolvedValue({ email: 'coach@example.test' });
    const res = await POST(post({ ...SAVE, courseIds: ['not-a-uuid'] }));
    expect(res.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('turns a validation refusal into a 400 with the reason', async () => {
    mocks.session.mockResolvedValue({ email: 'coach@example.test' });
    mocks.save.mockRejectedValue(new GapMapValidationError('That course is not published.'));
    const res = await POST(post(SAVE));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ detail: 'That course is not published.' });
  });
});
