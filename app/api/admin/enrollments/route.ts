import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { adminGrantEnrollment } from '@/lib/admin/admin-enrollment-mutations';

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    studentId?: string;
    courseSlug?: string;
  };

  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const courseSlug = typeof body.courseSlug === 'string' ? body.courseSlug.trim() : '';
  if (!studentId || !courseSlug) {
    return NextResponse.json({ detail: 'studentId and courseSlug are required' }, { status: 400 });
  }

  try {
    const result = await adminGrantEnrollment({ studentId, courseSlug });
    if (result.kind === 'already_enrolled') {
      return NextResponse.json({ ok: true, alreadyEnrolled: true, enrollmentId: result.enrollmentId });
    }
    return NextResponse.json({ ok: true, alreadyEnrolled: false, enrollmentId: result.enrollmentId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'USER_NOT_FOUND') return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    if (msg === 'WORKBOOK_COURSE_NOT_FOUND') {
      return NextResponse.json({ detail: 'Course not in workbook catalog' }, { status: 400 });
    }
    return NextResponse.json({ detail: 'Failed to grant enrollment' }, { status: 500 });
  }
}
