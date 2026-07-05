/**
 * Practical (instructor-graded) assessments: rubric definition, student submission,
 * and the instructor review queue + grading (GP-457).
 *
 * A practical assessment belongs to a course and carries a rubric (LmsRubricCriterion).
 * Students submit written evidence; instructors/admins grade each criterion against the
 * rubric, and the submission is marked passed/failed by the assessment's pass threshold.
 * (Portfolio file uploads are tracked separately — GP-122.)
 */
import { prisma } from '@/lib/prisma';
import { runSerializable } from '@/lib/server/db-tx';

/** Roles permitted to review practical-assessment submissions (mirrors course-review roles). */
export function canReviewAssessments(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'instructor';
}

export class AssessmentError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AssessmentError';
  }
}

export type CriterionScoreInput = { criterionId: string; points: number; comment?: string };

export type RubricCriterionDTO = {
  id: string;
  label: string;
  description: string;
  maxPoints: number;
  orderIndex: number;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
}

function asScores(value: unknown): CriterionScoreInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      criterionId: String(x.criterionId ?? ''),
      points: typeof x.points === 'number' ? x.points : 0,
      comment: typeof x.comment === 'string' ? x.comment : undefined,
    }));
}

export type ReviewQueueItem = {
  id: string;
  status: string;
  createdAt: string;
  assessmentId: string;
  assessmentTitle: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  evidenceText: string;
  evidenceUrls: string[];
};

/** Submissions awaiting instructor action (pending or under_review), oldest first. */
export async function listReviewQueue(): Promise<ReviewQueueItem[]> {
  const rows = await prisma.lmsAssessmentSubmission.findMany({
    where: { status: { in: ['pending', 'under_review'] } },
    orderBy: { createdAt: 'asc' },
    include: {
      assessment: { select: { id: true, title: true, courseId: true } },
      student: { select: { id: true, fullName: true, email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    assessmentId: r.assessmentId,
    assessmentTitle: r.assessment.title,
    courseId: r.assessment.courseId,
    studentId: r.studentId,
    studentName: r.student.fullName ?? 'Unknown',
    studentEmail: r.student.email,
    evidenceText: r.evidenceText,
    evidenceUrls: asStringArray(r.evidenceUrls),
  }));
}

export type SubmissionDetail = {
  id: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  totalScore: number | null;
  evidenceText: string;
  evidenceUrls: string[];
  assessment: {
    id: string;
    title: string;
    instructions: string;
    passThreshold: number;
    courseId: string;
  };
  criteria: RubricCriterionDTO[];
  student: { id: string; name: string; email: string };
  criterionScores: CriterionScoreInput[];
};

export async function getSubmissionForReview(submissionId: string): Promise<SubmissionDetail | null> {
  const r = await prisma.lmsAssessmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assessment: { include: { criteria: { orderBy: { orderIndex: 'asc' } } } },
      student: { select: { id: true, fullName: true, email: true } },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    reviewerNotes: r.reviewerNotes,
    totalScore: r.totalScore,
    evidenceText: r.evidenceText,
    evidenceUrls: asStringArray(r.evidenceUrls),
    assessment: {
      id: r.assessment.id,
      title: r.assessment.title,
      instructions: r.assessment.instructions,
      passThreshold: r.assessment.passThreshold,
      courseId: r.assessment.courseId,
    },
    criteria: r.assessment.criteria.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      maxPoints: c.maxPoints,
      orderIndex: c.orderIndex,
    })),
    student: { id: r.student.id, name: r.student.fullName ?? 'Unknown', email: r.student.email },
    criterionScores: asScores(r.criterionScores),
  };
}

/** Student submits written evidence for a published practical assessment. Requires an active enrolment. */
export async function submitPracticalAssessment(input: {
  studentId: string;
  assessmentId: string;
  evidenceText: string;
  evidenceUrls?: string[];
}): Promise<{ id: string; status: string; createdAt: string }> {
  const assessment = await prisma.lmsPracticalAssessment.findUnique({
    where: { id: input.assessmentId },
  });
  if (!assessment || !assessment.isPublished) {
    throw new AssessmentError(404, 'Assessment not found');
  }
  const enrolment = await prisma.lmsEnrollment.findFirst({
    where: {
      studentId: input.studentId,
      courseId: assessment.courseId,
      status: { not: 'cancelled' },
    },
  });
  if (!enrolment) {
    throw new AssessmentError(403, 'You must be enrolled in this course to submit');
  }
  const text = input.evidenceText.trim();
  if (text.length < 10) {
    throw new AssessmentError(400, 'Evidence description is too short');
  }

  const created = await prisma.lmsAssessmentSubmission.create({
    data: {
      assessmentId: input.assessmentId,
      studentId: input.studentId,
      evidenceText: text,
      evidenceUrls: asStringArray(input.evidenceUrls),
      status: 'pending',
    },
    select: { id: true, status: true, createdAt: true },
  });
  return { id: created.id, status: created.status, createdAt: created.createdAt.toISOString() };
}

/** Instructor grades a submission against its rubric; sets passed/failed by the pass threshold. */
export async function reviewSubmission(input: {
  /** LMS-user id of the reviewer, or null for an env-admin-panel review. */
  reviewerId?: string | null;
  submissionId: string;
  scores: CriterionScoreInput[];
  notes?: string;
}): Promise<{ id: string; status: string; totalScore: number; maxScore: number; passed: boolean }> {
  return runSerializable(async (tx) => {
    const sub = await tx.lmsAssessmentSubmission.findUnique({
      where: { id: input.submissionId },
      include: { assessment: { include: { criteria: true } } },
    });
    if (!sub) throw new AssessmentError(404, 'Submission not found');
    if (sub.status === 'passed' || sub.status === 'failed') {
      throw new AssessmentError(409, 'Submission has already been reviewed');
    }

    const criteria = sub.assessment.criteria;
    const byId = new Map(criteria.map((c) => [c.id, c]));
    if (input.scores.length !== criteria.length) {
      throw new AssessmentError(400, 'Every rubric criterion must be scored');
    }
    let total = 0;
    for (const s of input.scores) {
      const c = byId.get(s.criterionId);
      if (!c) throw new AssessmentError(400, `Unknown criterion ${s.criterionId}`);
      if (typeof s.points !== 'number' || s.points < 0 || s.points > c.maxPoints) {
        throw new AssessmentError(400, `Score for "${c.label}" must be between 0 and ${c.maxPoints}`);
      }
      total += s.points;
    }

    const maxScore = criteria.reduce((acc, c) => acc + c.maxPoints, 0);
    const pct = maxScore > 0 ? (total / maxScore) * 100 : 0;
    const passed = pct >= sub.assessment.passThreshold;

    const updated = await tx.lmsAssessmentSubmission.update({
      where: { id: input.submissionId },
      data: {
        status: passed ? 'passed' : 'failed',
        criterionScores: input.scores,
        totalScore: total,
        reviewerId: input.reviewerId ?? null,
        reviewerNotes: input.notes?.trim() || null,
        reviewedAt: new Date(),
      },
      select: { id: true, status: true },
    });
    return { id: updated.id, status: updated.status, totalScore: total, maxScore, passed };
  });
}

/** A student's own practical-assessment submissions. */
export async function listStudentSubmissions(studentId: string) {
  const rows = await prisma.lmsAssessmentSubmission.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: { assessment: { select: { title: true, courseId: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    assessmentTitle: r.assessment.title,
    courseId: r.assessment.courseId,
    totalScore: r.totalScore,
    reviewerNotes: r.reviewerNotes,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
  }));
}

/** Published assessment + rubric for a student to view before submitting. */
export async function getPublishedAssessment(assessmentId: string) {
  const a = await prisma.lmsPracticalAssessment.findUnique({
    where: { id: assessmentId },
    include: { criteria: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!a || !a.isPublished) return null;
  return {
    id: a.id,
    title: a.title,
    instructions: a.instructions,
    passThreshold: a.passThreshold,
    courseId: a.courseId,
    criteria: a.criteria.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      maxPoints: c.maxPoints,
      orderIndex: c.orderIndex,
    })),
  };
}
