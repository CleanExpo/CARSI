import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-729 — a failed critical criterion fails the practical assessment whatever the
 * total. A criterion is critical when its label carries the "(critical)" marker the
 * course drafts use. Full marks on a critical criterion means it was met.
 */
const mock = vi.hoisted(() => ({
  subFindUnique: vi.fn(),
  subUpdate: vi.fn(),
  enrolFindMany: vi.fn(),
  assessmentFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: { findMany: mock.enrolFindMany },
    lmsPracticalAssessment: { findMany: mock.assessmentFindMany },
  },
}));
vi.mock('@/lib/server/course-prerequisites', () => ({
  filterCoursesPassingPrerequisites: async (a: { courseIds: string[] }) => new Set(a.courseIds),
}));
vi.mock('@/lib/server/db-tx', () => ({
  runSerializable: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ lmsAssessmentSubmission: { findUnique: mock.subFindUnique, update: mock.subUpdate } }),
}));

const { reviewSubmission, listAvailableAssessmentsForStudent, AssessmentError } =
  await import('./practical-assessment');
const { gradeRubric } = await import('@/lib/practical-assessment-grading');

// Pass threshold 80%. Site safety (critical) is 5 of 100 points, so a learner can
// reach 95% with 0 on it.
const CRITERIA = [
  { id: 'c1', label: 'Pre-job check (critical)', maxPoints: 45, orderIndex: 0 },
  { id: 'c2', label: 'Timber, quote and handover', maxPoints: 45, orderIndex: 1 },
  { id: 'c3', label: 'Site safety throughout (critical)', maxPoints: 5, orderIndex: 2 },
  { id: 'c4', label: 'Tile and grout (critical for the tap test)', maxPoints: 5, orderIndex: 3 },
];

function scores(points: Record<string, number>) {
  return Object.entries(points).map(([criterionId, p]) => ({ criterionId, points: p }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.subFindUnique.mockResolvedValue({
    id: 's1',
    status: 'pending',
    assessment: { passThreshold: 80, criteria: CRITERIA },
  });
  mock.subUpdate.mockImplementation(async ({ data }: { data: { status: string } }) => ({
    id: 's1',
    status: data.status,
  }));
});

describe('reviewSubmission — critical criteria', () => {
  it('FAILS when one critical criterion is not met even though total marks pass', async () => {
    const r = await reviewSubmission({
      submissionId: 's1',
      scores: scores({ c1: 45, c2: 45, c3: 0, c4: 5 }),
    });
    expect(r.totalScore).toBe(95);
    expect(r.passed).toBe(false);
    expect(r.status).toBe('failed');
    expect(r.failedCriticalCriteria).toEqual(['Site safety throughout (critical)']);
    expect(r.reason).toContain('Site safety throughout (critical)');
    const data = mock.subUpdate.mock.calls[0][0].data;
    expect(data.status).toBe('failed');
    // The learner's page reads reviewerNotes, so the reason is stored there too.
    expect(data.reviewerNotes).toContain('Site safety throughout (critical)');
  });

  it('PASSES when every criterion is met', async () => {
    const r = await reviewSubmission({
      submissionId: 's1',
      scores: scores({ c1: 45, c2: 45, c3: 5, c4: 5 }),
    });
    expect(r.passed).toBe(true);
    expect(r.status).toBe('passed');
    expect(r.failedCriticalCriteria).toEqual([]);
    expect(r.reason).toBeNull();
  });

  it('PASSES when only a non-critical criterion fails and the total clears the threshold', async () => {
    mock.subFindUnique.mockResolvedValue({
      id: 's1',
      status: 'pending',
      assessment: {
        passThreshold: 80,
        criteria: [
          { id: 'a', label: 'Core task (critical)', maxPoints: 70, orderIndex: 0 },
          { id: 'b', label: 'Handover', maxPoints: 20, orderIndex: 1 },
          { id: 'c', label: 'Extras', maxPoints: 10, orderIndex: 2 },
        ],
      },
    });
    const r = await reviewSubmission({ submissionId: 's1', scores: scores({ a: 70, b: 20, c: 0 }) });
    expect(r.totalScore).toBe(90);
    expect(r.passed).toBe(true);
    expect(r.failedCriticalCriteria).toEqual([]);
  });

  it('still FAILS on total marks alone when no critical criterion is involved', async () => {
    const r = await reviewSubmission({
      submissionId: 's1',
      scores: scores({ c1: 45, c2: 0, c3: 5, c4: 5 }),
    });
    expect(r.passed).toBe(false);
    expect(r.failedCriticalCriteria).toEqual([]);
  });

  it('keeps the assessor notes and appends the reason', async () => {
    await reviewSubmission({
      submissionId: 's1',
      scores: scores({ c1: 45, c2: 45, c3: 0, c4: 5 }),
      notes: 'Good work otherwise.',
    });
    const notes = mock.subUpdate.mock.calls[0][0].data.reviewerNotes as string;
    expect(notes.startsWith('Good work otherwise.')).toBe(true);
    expect(notes).toContain('Site safety throughout (critical)');
  });

  it('does not treat a conditional "(critical for ...)" label as an unconditional critical', async () => {
    const r = await reviewSubmission({
      submissionId: 's1',
      scores: scores({ c1: 45, c2: 45, c3: 5, c4: 0 }),
    });
    expect(r.passed).toBe(true);
  });

  it('a partial mark on a critical criterion is not met', async () => {
    const r = await reviewSubmission({
      submissionId: 's1',
      scores: scores({ c1: 44, c2: 45, c3: 5, c4: 5 }),
    });
    expect(r.passed).toBe(false);
    expect(r.failedCriticalCriteria).toEqual(['Pre-job check (critical)']);
  });
});

describe('reviewSubmission — the submitted ids must equal the rubric ids exactly', () => {
  it('refuses a duplicate id that hides a skipped critical criterion (400, nothing stored)', async () => {
    const dup = [
      { criterionId: 'c1', points: 45 },
      { criterionId: 'c2', points: 45 },
      { criterionId: 'c2', points: 5 },
      { criterionId: 'c4', points: 5 },
    ];
    await expect(reviewSubmission({ submissionId: 's1', scores: dup })).rejects.toMatchObject({
      status: 400,
    });
    expect(mock.subUpdate).not.toHaveBeenCalled();
  });

  it('refuses the same id repeated to reach the right count', async () => {
    const dup = ['c2', 'c2', 'c2', 'c2'].map((criterionId) => ({ criterionId, points: 45 }));
    await expect(reviewSubmission({ submissionId: 's1', scores: dup })).rejects.toBeInstanceOf(
      AssessmentError,
    );
    expect(mock.subUpdate).not.toHaveBeenCalled();
  });

  it('refuses a non-finite score (NaN would slip past the range check)', async () => {
    await expect(
      reviewSubmission({ submissionId: 's1', scores: scores({ c1: 45, c2: 45, c3: Number.NaN, c4: 5 }) }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mock.subUpdate).not.toHaveBeenCalled();
  });

  it('refuses an unknown id and a missing id', async () => {
    await expect(
      reviewSubmission({ submissionId: 's1', scores: scores({ c1: 45, c2: 45, c3: 5, zzz: 5 }) }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      reviewSubmission({ submissionId: 's1', scores: scores({ c1: 45, c2: 45, c3: 5 }) }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mock.subUpdate).not.toHaveBeenCalled();
  });
});

describe('gradeRubric — the one rule shared by the server and the review screen', () => {
  const rubric = [
    { id: 'safety', label: 'Site safety (critical)', maxPoints: 5 },
    { id: 'other', label: 'Everything else', maxPoints: 95 },
  ];
  it('projects not-passed for 95/100 with 0 on a critical criterion', () => {
    const g = gradeRubric({ criteria: rubric, scores: { safety: 0, other: 95 }, passThreshold: 80 });
    expect(g.passed).toBe(false);
    expect(g.failedCriticalCriteria).toEqual(['Site safety (critical)']);
    expect(g.total).toBe(95);
  });
  it('projects passed when the critical criterion is met', () => {
    const g = gradeRubric({ criteria: rubric, scores: { safety: 5, other: 80 }, passThreshold: 80 });
    expect(g.passed).toBe(true);
  });
});

describe('listAvailableAssessmentsForStudent — critical flag on the learner list', () => {
  it('carries critical on each criterion', async () => {
    mock.enrolFindMany.mockResolvedValue([{ courseId: 'crs' }]);
    mock.assessmentFindMany.mockResolvedValue([
      {
        id: 'a1',
        title: 'T',
        instructions: '',
        passThreshold: 80,
        course: { title: 'C' },
        createdAt: new Date(),
        criteria: [
          { id: 'x', label: 'Site safety (critical)', description: '', maxPoints: 5 },
          { id: 'y', label: 'Handover', description: '', maxPoints: 5 },
        ],
        submissions: [],
      },
    ]);
    const out = await listAvailableAssessmentsForStudent('stu');
    expect(out[0].criteria.map((c: { critical: boolean }) => c.critical)).toEqual([true, false]);
  });
});
