import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-729 — every reader and writer of rubric criteria carries the `critical` flag, and
 * the admin review screen's live preview follows the same rule as the server.
 */
const mock = vi.hoisted(() => ({
  subFindUnique: vi.fn(),
  assessmentFindUnique: vi.fn(),
  assessmentFindMany: vi.fn(),
  assessmentCreate: vi.fn(),
  assessmentUpdate: vi.fn(),
  criterionDeleteMany: vi.fn(),
  courseFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsAssessmentSubmission: { findUnique: mock.subFindUnique },
    lmsPracticalAssessment: {
      findUnique: mock.assessmentFindUnique,
      findMany: mock.assessmentFindMany,
      create: mock.assessmentCreate,
    },
    lmsCourse: { findUnique: mock.courseFindUnique },
  },
}));
vi.mock('@/lib/server/course-prerequisites', () => ({
  filterCoursesPassingPrerequisites: async (a: { courseIds: string[] }) => new Set(a.courseIds),
}));
vi.mock('@/lib/server/db-tx', () => ({
  runSerializable: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      lmsPracticalAssessment: { findUnique: mock.assessmentFindUnique, update: mock.assessmentUpdate },
      lmsRubricCriterion: { deleteMany: mock.criterionDeleteMany },
    }),
}));

const {
  getSubmissionForReview,
  getPublishedAssessment,
  getPracticalAssessmentForAdmin,
  parseAuthoringInput,
  createPracticalAssessment,
  updatePracticalAssessment,
} = await import('./practical-assessment');
const { gradeRubric, previewWouldPass } = await import('@/lib/practical-assessment-grading');

const ROWS = [
  { id: 'x', label: 'Isolate the power', description: '', maxPoints: 5, orderIndex: 0, critical: true },
  { id: 'y', label: 'Handover (critical)', description: '', maxPoints: 95, orderIndex: 1, critical: false },
];

beforeEach(() => vi.clearAllMocks());

describe('read paths carry the stored critical flag, not the wording', () => {
  it('getSubmissionForReview (admin review screen)', async () => {
    mock.subFindUnique.mockResolvedValue({
      id: 's',
      status: 'pending',
      createdAt: new Date(),
      reviewedAt: null,
      reviewerNotes: null,
      totalScore: null,
      evidenceText: 'e',
      evidenceUrls: [],
      criterionScores: [],
      assessment: { id: 'a', title: 'T', instructions: '', passThreshold: 80, courseId: 'c', criteria: ROWS },
      student: { id: 'u', fullName: 'S', email: 's@x' },
    });
    const d = await getSubmissionForReview('s');
    expect(d?.criteria.map((c) => c.critical)).toEqual([true, false]);
  });

  it('getPublishedAssessment (student view)', async () => {
    mock.assessmentFindUnique.mockResolvedValue({
      id: 'a',
      title: 'T',
      instructions: '',
      passThreshold: 80,
      courseId: 'c',
      isPublished: true,
      criteria: ROWS,
    });
    const d = await getPublishedAssessment('a');
    expect(d?.criteria.map((c) => c.critical)).toEqual([true, false]);
  });

  it('getPracticalAssessmentForAdmin (the editor load, so a re-save keeps the flag)', async () => {
    mock.assessmentFindUnique.mockResolvedValue({
      id: 'a',
      courseId: 'c',
      title: 'T',
      instructions: '',
      passThreshold: 80,
      isPublished: true,
      criteria: ROWS,
    });
    const d = await getPracticalAssessmentForAdmin('a');
    expect(d?.criteria.map((c) => (c as { critical?: boolean }).critical)).toEqual([true, false]);
  });
});

describe('writers accept and persist critical', () => {
  const body = {
    courseId: 'c',
    title: 'T',
    instructions: '',
    passThreshold: 80,
    isPublished: false,
    criteria: [
      { label: 'Isolate the power', maxPoints: 5, critical: true },
      { label: 'Handover (critical)', maxPoints: 95 },
      { label: 'Junk flag', maxPoints: 5, critical: 'true' },
    ],
  };

  it('parseAuthoringInput keeps only a real boolean true', () => {
    const p = parseAuthoringInput(body);
    expect(p.criteria.map((c) => c.critical)).toEqual([true, false, false]);
  });

  it('createPracticalAssessment writes critical on each criterion', async () => {
    mock.courseFindUnique.mockResolvedValue({ id: 'c' });
    mock.assessmentCreate.mockResolvedValue({ id: 'a' });
    await createPracticalAssessment(parseAuthoringInput(body));
    const rows = mock.assessmentCreate.mock.calls[0][0].data.criteria.create;
    expect(rows.map((r: { critical: boolean }) => r.critical)).toEqual([true, false, false]);
  });

  it('updatePracticalAssessment writes critical on the replacement criteria', async () => {
    mock.assessmentFindUnique.mockResolvedValue({ id: 'a' });
    await updatePracticalAssessment('a', parseAuthoringInput(body));
    const rows = mock.assessmentUpdate.mock.calls[0][0].data.criteria.create;
    expect(rows.map((r: { critical: boolean }) => r.critical)).toEqual([true, false, false]);
  });
});

describe('admin review screen preview (previewWouldPass)', () => {
  const criteria = [
    { id: 'safety', label: 'Safety', maxPoints: 5, critical: true },
    { id: 'other', label: 'Other', maxPoints: 95, critical: false },
  ];
  it('is false when a critical criterion is below full points, even at 95%', () => {
    expect(previewWouldPass({ criteria, scores: { safety: 0, other: 95 }, passThreshold: 80 })).toBe(false);
  });
  it('is true when the critical criterion has full points and the total clears', () => {
    expect(previewWouldPass({ criteria, scores: { safety: 5, other: 80 }, passThreshold: 80 })).toBe(true);
  });
  it('agrees with gradeRubric on every score combination', () => {
    for (const safety of [0, 3, 5]) {
      for (const other of [0, 50, 75, 76, 95]) {
        const input = { criteria, scores: { safety, other }, passThreshold: 80 };
        expect(previewWouldPass(input)).toBe(gradeRubric(input).passed);
      }
    }
  });
});

describe('backfill SQL matches the retired label rule', () => {
  // The rule this migration freezes into data: /\(\s*critical\s*\)/i on the label.
  const legacy = (label: string) => /\(\s*critical\s*\)/i.test(label);
  const dir = join(process.cwd(), 'prisma', 'migrations');
  const sql = () =>
    readFileSync(join(dir, '20261121120000_rubric_criterion_critical', 'migration.sql'), 'utf8');

  it('adds the column NOT NULL DEFAULT false', () => {
    expect(sql()).toMatch(
      /ALTER TABLE "lms_rubric_criteria"\s+ADD COLUMN "critical" BOOLEAN NOT NULL DEFAULT false/,
    );
  });

  it('backfills with a pattern that selects exactly what the old rule selected', () => {
    const m = sql().match(/SET "critical" = true\s+WHERE "label" ~\* '([^']+)'/);
    expect(m).not.toBeNull();
    // Postgres ARE and JS share this syntax for the tokens used (\(, \), \s, \uXXXX, [...], *).
    const re = new RegExp(m![1], 'i');
    const labels = [
      'Pre-job check (critical)',
      'Site safety throughout (CRITICAL)',
      'Safety ( critical )',
      'Safety ( critical\t)',
      'Safety ( critical　)',
      'Safety (critical﻿)',
      'Tile and grout (critical for the tap test)',
      'Critical thinking',
      'critical',
      '(not critical)',
      'Safety (critical',
      'Safety critical)',
      'Safety ( crit ical )',
      '',
    ];
    for (const l of labels) expect(re.test(l), l).toBe(legacy(l));
  });
});
