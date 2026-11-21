import { beforeEach, describe, expect, it, vi } from 'vitest';

// GP-758: the manual optimiser cron must only store a draft for an admin to review at
// /admin/courses/[id]/optimize. It must never change live course content.

const mocks = vi.hoisted(() => ({
  adminGetCourse: vi.fn(),
  adminUpdateCourse: vi.fn(),
  courseToAdminDto: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  complete: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/admin/admin-courses-service', () => ({
  adminGetCourse: mocks.adminGetCourse,
  adminUpdateCourse: mocks.adminUpdateCourse,
  courseToAdminDto: mocks.courseToAdminDto,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: { findMany: mocks.findMany, findUnique: mocks.findUnique, update: mocks.update },
  },
}));
vi.mock('./anthropic-client', () => ({
  resolveAnthropicConfig: () => ({ configured: true }),
  anthropicComplete: mocks.complete,
  AnthropicAPIError: class extends Error {},
}));
vi.mock('./email', () => ({ isEmailConfigured: () => false, sendEmail: mocks.sendEmail }));

import { runOptimizeCoursesCron } from './optimize-courses-cron';

const MODULE_BODY = [
  'A carpet in a rental unit has been wet for two days after a washing machine hose failed. The technician starts by walking the room with a moisture meter and marking the wet edge on the floor plan.',
  '"How long before we can put the furniture back?" the tenant asks. The technician explains that drying depends on the readings, not on a fixed number of days, and books a follow-up visit.',
  'On the next visit the readings are compared with a dry reference area in the same unit. The technician records each reading on the job sheet so the insurer can see the trend over time.',
  'Before leaving site the technician checks every air mover lead is on a 10 A GPO with an RCD, photographs the setup and leaves the tenant a short note about what happens next.',
].join('\n\n');

const LIVE_MODULES = Array.from({ length: 9 }, (_, i) => ({
  id: `module-${i + 1}`,
  title: i === 8 ? 'What you learnt' : `Existing module ${i + 1}`,
  textContent: `<p>Original live text for module ${i + 1}.</p>`,
}));

function liveCourse(id: string, meta: Record<string, unknown>) {
  return {
    id,
    slug: id,
    title: `Course ${id}`,
    isFree: false,
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    meta,
  };
}

const pendingDraft = {
  token: 'pending-review',
  generatedAt: '2026-11-01T00:00:00.000Z',
  title: 'Course pending',
  description: '',
  modules: [{ title: 'Draft module', textContent: 'Draft text awaiting review.' }],
};

// In-memory course rows, so a meta write is visible to the next read like a real database.
let courses: Record<string, ReturnType<typeof liveCourse>>;

beforeEach(() => {
  vi.resetAllMocks();
  courses = {
    fresh: liveCourse('fresh', { keep: 'yes' }),
    pending: liveCourse('pending', { optimizeDraft: pendingDraft }),
  };
  mocks.findMany.mockResolvedValue([courses.fresh, courses.pending]);
  mocks.adminGetCourse.mockImplementation(async (id: string) => ({
    ...courses[id],
    modules: [],
  }));
  mocks.courseToAdminDto.mockImplementation((course: { id?: string; title?: string }) => ({
    id: course.id ?? 'fresh',
    title: course.title ?? 'Course fresh',
    description: 'Drying a wet carpet in an Australian rental property.',
    priceAud: 0,
    isFree: false,
    published: true,
    modules: LIVE_MODULES,
  }));
  mocks.adminUpdateCourse.mockResolvedValue({ id: 'fresh', title: 'Course fresh' });
  mocks.findUnique.mockImplementation(
    async ({ where }: { where: { id: string } }) => courses[where.id]
  );
  mocks.update.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: { meta: Record<string, unknown> } }) => {
      courses[where.id] = { ...courses[where.id], meta: data.meta };
      return courses[where.id];
    }
  );
  mocks.complete.mockResolvedValue(MODULE_BODY);
});

describe('optimiser cron leaves live course content unchanged (GP-758)', () => {
  it('stores a draft for review and never writes live modules', async () => {
    await runOptimizeCoursesCron({ scope: 'paid' });

    expect(mocks.adminUpdateCourse).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
    for (const [args] of mocks.update.mock.calls) {
      expect(Object.keys(args.data)).toEqual(['meta']);
    }

    const freshWrites = mocks.update.mock.calls
      .map(([args]) => args)
      .filter((args) => args.where.id === 'fresh');
    expect(freshWrites.length).toBeGreaterThan(0);
    const savedMeta = freshWrites.at(-1).data.meta as Record<string, unknown>;
    const { optimizeDraft, ...rest } = savedMeta;
    expect(rest).toEqual({ keep: 'yes' });
    expect(optimizeDraft).toMatchObject({ modules: expect.any(Array) });
  });

  it('does not overwrite a draft that is already waiting for review', async () => {
    await runOptimizeCoursesCron({ scope: 'paid' });

    const pendingWrites = mocks.update.mock.calls.filter(([args]) => args.where.id === 'pending');
    expect(pendingWrites).toEqual([]);
    expect(mocks.adminGetCourse).not.toHaveBeenCalledWith('pending');
  });
});
