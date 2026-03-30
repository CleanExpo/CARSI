import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { adminRevokeEnrollment } from '@/lib/admin/admin-enrollment-mutations';

type RouteContext = { params: Promise<{ enrollmentId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { enrollmentId } = await context.params;
  const id = typeof enrollmentId === 'string' ? enrollmentId.trim() : '';
  if (!id) {
    return NextResponse.json({ detail: 'Invalid enrollment id' }, { status: 400 });
  }

  try {
    await adminRevokeEnrollment(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'ENROLLMENT_NOT_FOUND') {
      return NextResponse.json({ detail: 'Enrollment not found' }, { status: 404 });
    }
    if (msg === 'COURSE_NOT_IN_WORKBOOK') {
      return NextResponse.json({ detail: 'Course not managed from workbook' }, { status: 400 });
    }
    return NextResponse.json({ detail: 'Failed to remove enrollment' }, { status: 500 });
  }
}
