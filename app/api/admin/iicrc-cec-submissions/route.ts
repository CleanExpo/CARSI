import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  listIicrcCecSubmissionsForAdmin,
  retryIicrcCecSubmission,
} from '@/lib/server/iicrc-cec-submission';

export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const submissions = await listIicrcCecSubmissionsForAdmin({ limit: 200 });
  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: { submissionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
  if (!submissionId) {
    return NextResponse.json({ detail: 'submissionId is required' }, { status: 400 });
  }

  try {
    const result = await retryIicrcCecSubmission(submissionId);
    return NextResponse.json({ ok: true, status: result.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'SUBMISSION_NOT_FOUND') {
      return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });
    }
    console.error('[admin/iicrc-cec-submissions]', e);
    return NextResponse.json({ detail: 'Retry failed' }, { status: 500 });
  }
}
