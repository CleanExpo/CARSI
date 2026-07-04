import { type NextRequest, NextResponse } from 'next/server';

import {
  manualSendIicrcCecForEnrollment,
  retryIicrcCecSubmission,
} from '@/lib/server/iicrc-cec-submission';
import { captureServerError } from '@/lib/server/sentry';

/** PDF + Cloudinary + Resend can exceed the default serverless limit. */
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProcessBody = {
  enrollmentId?: string;
  studentId?: string;
  iicrcMemberNumber?: string;
  cecHours?: number | null;
  initiatedByAdminEmail?: string;
  submissionId?: string;
};

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: ProcessBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
  if (submissionId) {
    try {
      const result = await retryIicrcCecSubmission(submissionId, {
        initiatedByAdminEmail: body.initiatedByAdminEmail ?? null,
      });
      return NextResponse.json({ ok: true, status: result.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'SUBMISSION_NOT_FOUND') {
        return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });
      }
      console.error('[iicrc-cec-submissions/process] retry', e);
      void captureServerError(e, { route: '/api/admin/iicrc-cec-submissions/process' });
      return NextResponse.json({ detail: 'Retry failed' }, { status: 500 });
    }
  }

  const enrollmentId = typeof body.enrollmentId === 'string' ? body.enrollmentId.trim() : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const iicrcMemberNumber =
    typeof body.iicrcMemberNumber === 'string' ? body.iicrcMemberNumber.trim() : '';

  if (!enrollmentId || !studentId || !iicrcMemberNumber) {
    return NextResponse.json(
      { detail: 'enrollmentId, studentId, and iicrcMemberNumber are required' },
      { status: 400 },
    );
  }

  try {
    const result = await manualSendIicrcCecForEnrollment({
      enrollmentId,
      studentId,
      iicrcMemberNumber,
      cecHours: body.cecHours ?? null,
      initiatedByAdminEmail: body.initiatedByAdminEmail ?? null,
    });
    return NextResponse.json({
      ok: result.status !== 'failed' && result.status !== 'skipped',
      status: result.status,
      submissionId: result.submissionId ?? null,
      failureReason: result.failureReason ?? null,
      detail: result.detail ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[iicrc-cec-submissions/process] manual send', e);
    void captureServerError(e, { route: '/api/admin/iicrc-cec-submissions/process' });
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
