import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ user: vi.fn(), enrollments: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: mocks.user },
    lmsEnrollment: { findMany: mocks.enrollments },
  },
}));

import { getCourseReferences } from '@/lib/seo/course-references-index';

import { getProofPackPayloadForStudent } from './proof-pack';

function enrolment(id: string, slug: string, title: string) {
  return {
    id,
    completedAt: new Date('2026-11-01T00:00:00Z'),
    certificateIssuedAt: null,
    course: { slug, title, iicrcDiscipline: null },
  };
}

describe('getProofPackPayloadForStudent — course references (BACKLOG #26)', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgresql://synthetic.invalid/test');
    mocks.user.mockReset().mockResolvedValue({ fullName: 'Sam Example', email: 'sam@example.com' });
    mocks.enrollments.mockReset();
  });

  it('attaches the committed reference list to each completed course, and nothing to a course without one', async () => {
    mocks.enrollments.mockResolvedValue([
      enrolment('e1', 'moisture-meters-readings-and-dry-standards', 'Moisture Meters'),
      enrolment('e2', 'social-media-marketing', 'Social Media Marketing'),
    ]);
    const p = await getProofPackPayloadForStudent('learner', 'https://carsi.com.au/');
    expect(p).not.toBeNull();
    const [withRefs, withoutRefs] = p!.credentials;

    const source = getCourseReferences('moisture-meters-readings-and-dry-standards');
    expect(source.length).toBeGreaterThan(0);
    expect(withRefs.references.map((r) => r.label)).toEqual(source.map((r) => r.label));
    expect(withoutRefs.references).toEqual([]);

    // References change nothing about CEC: neither course is in the approvals registry.
    expect(withRefs.cec_hours).toBe(0);
    expect(withoutRefs.cec_hours).toBe(0);
    expect(p!.summary.total_cec_hours).toBe(0);
  });
});
