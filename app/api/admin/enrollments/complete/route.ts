import { NextRequest, NextResponse } from 'next/server';

import {
  AdminBulkCompletePartialError,
  adminMarkEnrollmentsComplete,
} from '@/lib/admin/admin-enrollment-mutations';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    studentId?: string;
    enrollmentIds?: unknown;
  };

  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const rawIds = body.enrollmentIds;
  const enrollmentIds = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];

  if (!studentId || enrollmentIds.length === 0) {
    return NextResponse.json(
      { detail: 'studentId and at least one enrollmentId are required' },
      { status: 400 },
    );
  }

  try {
    const result = await adminMarkEnrollmentsComplete({
      studentId,
      enrollmentIds,
      initiatedByAdminEmail: session.email,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof AdminBulkCompletePartialError) {
      // Part-way failure (GP-769): earlier rows are already completed and audited. Say which.
      console.error('[admin/enrollments/complete] partial', e.failed.enrollmentId, e.failed.error);
      const done = e.completed.length;
      return NextResponse.json(
        {
          detail:
            done > 0
              ? `Marked ${done} course${done === 1 ? '' : 's'} complete, then one failed. ` +
                `${e.notAttempted.length} not attempted.`
              : `Could not mark the first course complete. ${e.notAttempted.length} not attempted.`,
          partial: true,
          completed: e.completed,
          failed: { enrollmentId: e.failed.enrollmentId },
          notAttempted: e.notAttempted,
        },
        { status: 500 },
      );
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
