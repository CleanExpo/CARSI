import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-729 — a failed critical criterion fails the practical assessment whatever the
 * total. A criterion is critical when its label carries the "(critical)" marker the
 * course drafts use. Full marks on a critical criterion means it was met.
 */
const mock = vi.hoisted(() => ({
  subFindUnique: vi.fn(),
  subUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/db-tx', () => ({
  runSerializable: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ lmsAssessmentSubmission: { findUnique: mock.subFindUnique, update: mock.subUpdate } }),
}));

const { reviewSubmission } = await import('./practical-assessment');

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
