import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  AssessmentError,
  deletePracticalAssessment,
  getPracticalAssessmentForAdmin,
  parseAuthoringInput,
  updatePracticalAssessment,
} from '@/lib/server/practical-assessment';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ assessmentId: string }> };

/** GET — full assessment (incl. unpublished) for the admin editor (GP-457). */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const { assessmentId } = await ctx.params;
  const assessment = await getPracticalAssessmentForAdmin(assessmentId);
  if (!assessment) {
    return NextResponse.json({ detail: 'Assessment not found' }, { status: 404 });
  }
  return NextResponse.json({ assessment });
}

/** PUT — update fields + replace rubric criteria (GP-457). */
export async function PUT(request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const { assessmentId } = await ctx.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }
  try {
    await updatePracticalAssessment(assessmentId, parseAuthoringInput(raw));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AssessmentError) {
      return NextResponse.json({ detail: err.message }, { status: err.status });
    }
    console.error('[admin/practical-assessments PUT]', err);
    return NextResponse.json({ detail: 'Failed to update assessment' }, { status: 500 });
  }
}

/** DELETE — remove an assessment (blocked if it has submissions) (GP-457). */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const { assessmentId } = await ctx.params;
  try {
    await deletePracticalAssessment(assessmentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AssessmentError) {
      return NextResponse.json({ detail: err.message }, { status: err.status });
    }
    console.error('[admin/practical-assessments DELETE]', err);
    return NextResponse.json({ detail: 'Failed to delete assessment' }, { status: 500 });
  }
}
