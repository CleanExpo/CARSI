import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { adminGrantEnrollment, adminGrantEnrollments } from '@/lib/admin/admin-enrollment-mutations';
import { isUniqueConstraintError } from '@/lib/server/db-errors';

function prismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    studentId?: string;
    courseSlug?: string;
    courseSlugs?: unknown;
  };

  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const courseSlug = typeof body.courseSlug === 'string' ? body.courseSlug.trim() : '';
  const courseSlugs = Array.isArray(body.courseSlugs)
    ? body.courseSlugs.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : courseSlug
      ? [courseSlug]
      : [];

  if (!studentId || courseSlugs.length === 0) {
    return NextResponse.json(
      { detail: 'studentId and at least one courseSlug (or courseSlugs) are required' },
      { status: 400 },
    );
  }

  try {
    if (courseSlugs.length === 1) {
      const result = await adminGrantEnrollment({ studentId, courseSlug: courseSlugs[0]! });
      if (result.kind === 'already_enrolled') {
        return NextResponse.json({ ok: true, alreadyEnrolled: 1, created: 0, enrollmentIds: [result.enrollmentId] });
      }
      return NextResponse.json({
        ok: true,
        alreadyEnrolled: 0,
        created: 1,
        enrollmentIds: [result.enrollmentId],
      });
    }

    const result = await adminGrantEnrollments({ studentId, courseSlugs });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = prismaErrorCode(e);
    console.error('[admin/enrollments] grant failed', { studentId, courseSlugs, msg, code, error: e });
    if (msg === 'USER_NOT_FOUND') return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    if (msg === 'NO_COURSES' || msg === 'INVALID_COURSE_SLUG') {
      return NextResponse.json({ detail: 'Invalid course selection' }, { status: 400 });
    }
    if (msg === 'WORKBOOK_COURSE_NOT_FOUND' || msg === 'COURSE_NOT_FOUND') {
      return NextResponse.json({ detail: 'Course not found in catalog' }, { status: 400 });
    }
    if (code === 'P2028') {
      return NextResponse.json(
        { detail: 'Course materialisation timed out — retry or ensure the course exists in the LMS catalog' },
        { status: 504 },
      );
    }
    if (isUniqueConstraintError(e)) {
      return NextResponse.json({ detail: 'Learner is already enrolled in one of these courses' }, { status: 409 });
    }
    return NextResponse.json({ detail: 'Failed to grant enrollment' }, { status: 500 });
  }
}
