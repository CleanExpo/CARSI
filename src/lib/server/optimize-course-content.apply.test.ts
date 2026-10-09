import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adminGetCourse: vi.fn(),
  adminUpdateCourse: vi.fn(),
  courseToAdminDto: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  complete: vi.fn(),
}));

vi.mock('@/lib/admin/admin-courses-service', () => ({
  adminGetCourse: mocks.adminGetCourse,
  adminUpdateCourse: mocks.adminUpdateCourse,
  courseToAdminDto: mocks.courseToAdminDto,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: { lmsCourse: { findUnique: mocks.findUnique, update: mocks.update } },
}));
vi.mock('./anthropic-client', () => ({
  resolveAnthropicConfig: () => ({ configured: true }), anthropicComplete: mocks.complete,
  AnthropicAPIError: class extends Error {},
}));

import { applyOptimizedCourseDraft, generateOptimizedCourseDraft, optimizeAndApplyCourse } from './optimize-course-content';

const draft = {
  token: 'reviewed-draft',
  generatedAt: '2026-09-30T00:00:00.000Z',
  title: 'Course',
  description: 'Course description',
  modules: [{ title: 'Draft module title', textContent: 'Rewritten practical lesson.' }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.adminGetCourse.mockResolvedValue({ meta: { optimizeDraft: draft }, modules: [] });
  mocks.adminUpdateCourse.mockResolvedValue({ id: 'course-id' });
  mocks.findUnique.mockResolvedValue({ meta: { optimizeDraft: draft, retained: 'yes' } });
  mocks.update.mockResolvedValue({ id: 'course-id' });
});

describe('applying an optimised draft preserves CEC ownership', () => {
  it.each(['generate', 'apply', 'cron'])('rejects structured curriculum before provider or mutation in %s', async (mode) => {
    mocks.adminGetCourse.mockResolvedValue({ meta: { optimizeDraft: draft, curriculumPersistence: null }, modules: [] });
    const operation = mode === 'generate' ? generateOptimizedCourseDraft('course-id')
      : mode === 'apply' ? applyOptimizedCourseDraft('course-id', draft.token)
      : optimizeAndApplyCourse('course-id');
    await expect(operation).rejects.toMatchObject({ status: 409 });
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.adminUpdateCourse).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.courseToAdminDto).not.toHaveBeenCalled();
  });
  it.each([
    { label: 'stale imported hours', cecHours: '99', resolvedCecHours: null },
    { label: 'registry-approved hours', cecHours: '99', resolvedCecHours: '1' },
    { label: 'no stored hours', cecHours: null, resolvedCecHours: null },
  ])('does not submit CEC changes for $label', async ({ label: _label, ...hours }) => {
    const dto = {
      title: 'Original course title',
      description: 'Original description',
      thumbnailUrl: 'https://example.test/cover.jpg',
      introVideoUrl: 'https://example.test/intro.mp4',
      introThumbnailUrl: 'https://example.test/intro.jpg',
      isFree: false,
      priceAud: 49,
      published: true,
      ...hours,
      durationHours: '2',
      iicrcDiscipline: null,
      level: 'beginner',
      category: 'restoration',
      modules: [
        {
          id: 'module-id',
          title: 'Original module title',
          textContent: '',
          videoUrl: 'https://example.test/module.mp4',
          quiz: { title: 'Retained quiz' },
        },
      ],
    };
    mocks.courseToAdminDto.mockReturnValue(dto);

    await applyOptimizedCourseDraft('course-id', draft.token);

    expect(mocks.adminUpdateCourse).toHaveBeenCalledOnce();
    const [id, input] = mocks.adminUpdateCourse.mock.calls[0];
    expect(id).toBe('course-id');
    expect(input).not.toHaveProperty('cecHours');
    expect(input).toMatchObject({
      title: dto.title,
      description: dto.description,
      isFree: false,
      priceAud: 49,
      published: true,
      durationHours: 2,
      modules: [
        {
          id: 'module-id',
          title: 'Original module title',
          textContent: 'Rewritten practical lesson.',
          videoUrl: 'https://example.test/module.mp4',
          quiz: { title: 'Retained quiz' },
        },
      ],
    });
    const savedMeta = mocks.update.mock.calls[0][0].data.meta;
    expect(savedMeta).toMatchObject({ retained: 'yes', optimizeAppliedAt: expect.any(String) });
    expect(savedMeta).not.toHaveProperty('optimizeDraft');
  });
});
