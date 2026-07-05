import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  AssessmentError,
  createPracticalAssessment,
  listCoursesForPicker,
  listPracticalAssessments,
  parseAuthoringInput,
} from '@/lib/server/practical-assessment';

export const dynamic = 'force-dynamic';

/** GET /api/admin/practical-assessments — all assessments + course options for authoring (GP-457). */
export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }
  try {
    const [assessments, courses] = await Promise.all([
      listPracticalAssessments(),
      listCoursesForPicker(),
    ]);
    return NextResponse.json({ assessments, courses });
  } catch (e) {
    console.error('[admin/practical-assessments GET]', e);
    return NextResponse.json({ detail: 'Failed to load assessments' }, { status: 500 });
  }
}

/** POST — create a practical assessment + rubric (GP-457). */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }
  try {
    const created = await createPracticalAssessment(parseAuthoringInput(raw));
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AssessmentError) {
      return NextResponse.json({ detail: err.message }, { status: err.status });
    }
    console.error('[admin/practical-assessments POST]', err);
    return NextResponse.json({ detail: 'Failed to create assessment' }, { status: 500 });
  }
}
