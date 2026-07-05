import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  AssessmentError,
  getSubmissionForReview,
  reviewSubmission,
  type CriterionScoreInput,
} from '@/lib/server/practical-assessment';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ submissionId: string }> };

/** GET — one submission + its rubric, for the instructor review screen (GP-457). */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const { submissionId } = await ctx.params;
  try {
    const submission = await getSubmissionForReview(submissionId);
    if (!submission) {
      return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });
    }
    return NextResponse.json({ submission });
  } catch (e) {
    console.error('[admin/practical-assessments/submissions GET]', e);
    return NextResponse.json({ detail: 'Failed to load submission' }, { status: 500 });
  }
}

/** POST — grade the submission against its rubric; marks passed/failed (GP-457). */
export async function POST(request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const { submissionId } = await ctx.params;

  let body: { scores?: unknown; notes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const rawScores = Array.isArray(body.scores) ? body.scores : [];
  const scores: CriterionScoreInput[] = rawScores.map((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    return {
      criterionId: String(o.criterionId ?? ''),
      points: Number(o.points ?? 0),
      comment: typeof o.comment === 'string' ? o.comment : undefined,
    };
  });
  const notes = typeof body.notes === 'string' ? body.notes : undefined;

  try {
    const result = await reviewSubmission({ reviewerId: null, submissionId, scores, notes });
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof AssessmentError) {
      return NextResponse.json({ detail: err.message }, { status: err.status });
    }
    console.error('[admin/practical-assessments/submissions POST]', err);
    return NextResponse.json({ detail: 'Failed to record review' }, { status: 500 });
  }
}
