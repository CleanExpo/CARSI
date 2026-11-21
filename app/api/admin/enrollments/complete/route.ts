import { NextRequest, NextResponse } from 'next/server';

import { adminMarkEnrollmentsComplete } from '@/lib/admin/admin-enrollment-mutations';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { NotCurrentAdminError } from '@/lib/server/current-admin';
import { readReviewAdminSession } from '@/lib/server/review-admin-session';

/**
 * POST /api/admin/enrollments/complete  { studentId, enrollmentIds, reason }
 * Marks every lesson complete for the given enrolments (GP-432). It does NOT skip assessments:
 * an enrolment completes only when its required assessments are passed. The reason is required
 * and is kept, with the acting admin, in the learner-record audit log.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    studentId?: string;
    enrollmentIds?: unknown;
    reason?: unknown;
  };

  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const rawIds = body.enrollmentIds;
  const enrollmentIds = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!studentId || enrollmentIds.length === 0) {
    return NextResponse.json(
      { detail: 'studentId and at least one enrollmentId are required' },
      { status: 400 },
    );
  }
  if (!reason || reason.length > 1000) {
    return NextResponse.json(
      { detail: 'A reason (1 to 1000 characters) is required; it is kept in the audit log.' },
      { status: 400 },
    );
  }

  try {
    const result = await adminMarkEnrollmentsComplete({
      studentId,
      enrollmentIds,
      session: await readReviewAdminSession(request),
      reason,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof NotCurrentAdminError) {
      return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'USER_NOT_FOUND') {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }
    if (msg === 'NO_ENROLLMENTS') {
      return NextResponse.json({ detail: 'No enrollments specified' }, { status: 400 });
    }
    if (msg === 'ENROLLMENT_NOT_FOUND') {
      return NextResponse.json(
        { detail: 'One or more enrollments were not found for this learner' },
        { status: 404 },
      );
    }
    return NextResponse.json({ detail: 'Failed to mark courses complete' }, { status: 500 });
  }
}
