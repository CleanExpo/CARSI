import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  CARSI_WORKSHOP_COURSE_SLUG,
  canDownloadParticipantManual,
  workshopAccessState,
} from '@/lib/server/carsi-workshop-access';
import {
  PRIVATE_DOCUMENT_HEADERS,
  renderParticipantManual,
} from '@/lib/server/carsi-workshop-manuals';

export const dynamic = 'force-dynamic';

/** Participant manual: enrolled roadshow attendees and authorised CARSI staff only. */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const course = await prisma.lmsCourse.findUnique({
    where: { slug: CARSI_WORKSHOP_COURSE_SLUG },
    select: {
      id: true,
      title: true,
      modules: {
        orderBy: { orderIndex: 'asc' },
        select: {
          title: true,
          lessons: {
            // Reading lessons only: knowledge-check lessons hold a quiz id, not manual text.
            where: { contentType: 'text' },
            orderBy: { orderIndex: 'asc' },
            select: { title: true, contentBody: true },
          },
        },
      },
    },
  });
  if (!course) {
    return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
  }

  const enrollment = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId: claims.sub, courseId: course.id } },
    select: { status: true },
  });
  const access = workshopAccessState(claims, enrollment?.status ?? null);
  if (!canDownloadParticipantManual(access)) {
    return NextResponse.json({ detail: 'Not enrolled in this workshop' }, { status: 403 });
  }

  return new NextResponse(renderParticipantManual(course.title, course.modules), {
    status: 200,
    headers: PRIVATE_DOCUMENT_HEADERS,
  });
}
