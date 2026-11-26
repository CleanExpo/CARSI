import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  pathways: [] as Array<{
    id: string;
    title: string;
    iicrcDiscipline: string | null;
    orderIndex: number;
    courses: Array<{
      orderIndex: number;
      course: { slug: string; title: string; isPublished: boolean; status: string };
    }>;
  }>,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsLearningPathway: {
      findMany: vi.fn(async () => state.pathways),
    },
  },
}));

import { resolveDbPathwayNext } from '@/lib/server/learning-pathways';

describe('resolveDbPathwayNext', () => {
  beforeEach(() => {
    state.pathways = [];
  });

  it('returns the next unpublished-enrolled course in a matching pathway', async () => {
    state.pathways = [
      {
        id: 'p1',
        title: 'Water restoration pathway',
        iicrcDiscipline: 'WRT',
        orderIndex: 0,
        courses: [
          {
            orderIndex: 0,
            course: {
              slug: 'water-damage-restoration-fundamentals',
              title: 'Water fundamentals',
              isPublished: true,
              status: 'published',
            },
          },
          {
            orderIndex: 1,
            course: {
              slug: 'mould-advanced',
              title: 'Applied microbial',
              isPublished: true,
              status: 'published',
            },
          },
        ],
      },
    ];

    const step = await resolveDbPathwayNext({
      completedSlugs: new Set(['water-damage-restoration-fundamentals']),
      enrolledSlugs: new Set(['water-damage-restoration-fundamentals']),
      completedDisciplines: ['WRT'],
    });

    expect(step?.slug).toBe('mould-advanced');
    expect(step?.reason).toMatch(/pathway/i);
    expect(step?.source).toBe('database');
  });
});