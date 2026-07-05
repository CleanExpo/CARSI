import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  AssessmentError,
  getPublishedAssessment,
  submitPracticalAssessment,
} from '@/lib/server/practical-assessment';

type Ctx = { params: Promise<{ assessmentId: string }> };

/** GET /api/lms/practical-assessments/[assessmentId] — published assessment + rubric (GP-457). */
export async function GET(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const { assessmentId } = await ctx.params;
  const assessment = await getPublishedAssessment(assessmentId);
  if (!assessment) {
    return NextResponse.json({ detail: 'Assessment not found' }, { status: 404 });
  }
  return NextResponse.json({ assessment });
}

/** POST — student submits written evidence for review (GP-457). */
export async function POST(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const { assessmentId } = await ctx.params;

  let body: { evidence_text?: unknown; evidence_urls?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }
  const evidenceText = typeof body.evidence_text === 'string' ? body.evidence_text : '';
  const evidenceUrls = Array.isArray(body.evidence_urls)
    ? body.evidence_urls.filter((x): x is string => typeof x === 'string')
    : [];

  try {
    const submission = await submitPracticalAssessment({
      studentId: claims.sub,
      assessmentId,
      evidenceText,
      evidenceUrls,
    });
    return NextResponse.json({ submission }, { status: 201 });
  } catch (err) {
    if (err instanceof AssessmentError) {
      return NextResponse.json({ detail: err.message }, { status: err.status });
    }
    console.error('[lms/practical-assessments submit]', err);
    return NextResponse.json({ detail: 'Failed to submit' }, { status: 500 });
  }
}
