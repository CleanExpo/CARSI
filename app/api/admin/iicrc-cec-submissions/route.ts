import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  listIicrcCecSubmissionsForAdmin,
  manualSendIicrcCecForEnrollment,
  retryIicrcCecSubmission,
} from '@/lib/server/iicrc-cec-submission';
import { listRenewalSubmissionsForStudent } from '@/lib/server/iicrc-renewal-communication';

export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const studentId = request.nextUrl.searchParams.get('studentId')?.trim() ?? '';
  if (studentId) {
    const submissions = await listRenewalSubmissionsForStudent(studentId);
    return NextResponse.json({ submissions });
  }

  const submissions = await listIicrcCecSubmissionsForAdmin({ limit: 200 });
  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: { submissionId?: string; enrollmentId?: string; studentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const enrollmentId = typeof body.enrollmentId === 'string' ? body.enrollmentId.trim() : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';

  if (enrollmentId && studentId) {
    try {
      const result = await manualSendIicrcCecForEnrollment({
        enrollmentId,
        studentId,
        initiatedByAdminEmail: session.email,
      });

      if (result.status === 'failed' || result.status === 'skipped') {
        const statusCode = result.failureReason === 'not_configured' ? 503 : 502;
        return NextResponse.json(
          {
            ok: false,
            status: result.status,
            submissionId: result.submissionId ?? null,
            failureReason: result.failureReason ?? null,
            detail: result.detail ?? 'IICRC renewal email could not be sent.',
          },
          { status: statusCode },
        );
      }

      return NextResponse.json({
        ok: true,
        status: result.status,
        submissionId: result.submissionId ?? null,
        alreadySent: result.alreadySent ?? false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'ENROLLMENT_NOT_FOUND') {
        return NextResponse.json({ detail: 'Enrollment not found for this learner' }, { status: 404 });
      }
      if (msg === 'IICRC_MEMBER_NUMBER_REQUIRED') {
        return NextResponse.json(
          { detail: 'Learner must have an IICRC member number on file before sending renewal email' },
          { status: 400 },
        );
      }
      if (msg === 'ENROLLMENT_NOT_COMPLETED') {
        return NextResponse.json({ detail: 'Course must be marked complete before sending to IICRC' }, { status: 400 });
      }
      if (msg === 'COURSE_NOT_CEC_ELIGIBLE') {
        return NextResponse.json({ detail: 'This course is not eligible for IICRC CEC submission' }, { status: 400 });
      }
      console.error('[admin/iicrc-cec-submissions] manual send', e);
      return NextResponse.json({ detail: 'Failed to send IICRC renewal email' }, { status: 500 });
    }
  }

  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
  if (!submissionId) {
    return NextResponse.json(
      { detail: 'submissionId or enrollmentId + studentId are required' },
      { status: 400 },
    );
  }

  try {
    const result = await retryIicrcCecSubmission(submissionId, {
      initiatedByAdminEmail: session.email,
    });
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
