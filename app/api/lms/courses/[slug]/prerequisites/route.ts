import { NextRequest, NextResponse } from 'next/server';

import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import { courseHasPrerequisites, parseCoursePrerequisites } from '@/lib/lms/course-prerequisites';
import { prisma } from '@/lib/prisma';
import { findCoursePrerequisiteBlock } from '@/lib/server/course-prerequisites';
import { isEnrolmentAccessAllowed } from '@/lib/server/enrollment-access';

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/lms/courses/[slug]/prerequisites — the locked state for the course page
 * (DECISIONS #41). UX only: the real gate runs in enrolment, checkout and the lesson/quiz
 * routes. Anonymous viewers are reported `locked` (completion is tied to an account) with
 * `signed_in: false`. A learner already enrolled is not locked (grandfathered at issuance),
 * except a seat issued locked (`prerequisite_gated`), which stays locked until completed.
 */
export async function GET(request: NextRequest, context: Params) {
  const { slug: raw } = await context.params;
  const slug = raw?.trim().toLowerCase() ?? '';
  if (!slug) return NextResponse.json({ detail: 'slug required' }, { status: 400 });
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const course = await prisma.lmsCourse.findUnique({
    where: { slug },
    select: { id: true, slug: true, meta: true },
  });
  if (!course) return NextResponse.json({ detail: 'Course not found' }, { status: 404 });

  const parsed = parseCoursePrerequisites(course.meta);
  if (!courseHasPrerequisites(parsed)) {
    return NextResponse.json({ has_prerequisites: false, locked: false, prerequisites: [] });
  }

  const token = request.cookies.get('auth_token')?.value;
  const claims = token ? await verifySessionToken(token) : null;
  if (!claims?.sub) {
    return NextResponse.json({ has_prerequisites: true, locked: true, signed_in: false, prerequisites: [] });
  }

  const enrolment = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId: claims.sub, courseId: course.id } },
    // prerequisiteGated: a team seat issued locked is reported locked here too, so the seat
    // holder sees "Complete <prerequisite> first" on the course page.
    select: { status: true, enrolledAt: true, paymentReference: true, prerequisiteGated: true },
  });
  const block = await findCoursePrerequisiteBlock({
    userId: claims.sub,
    isAdmin: () => isLmsClaimsAllowedAdminPanel(claims),
    course,
    // A revoked row is re-checked on re-enrolment, so only a live one exempts.
    enrolment: enrolment && isEnrolmentAccessAllowed(enrolment.status) ? enrolment : null,
  });
  return NextResponse.json({
    has_prerequisites: true,
    locked: Boolean(block),
    signed_in: true,
    // A live enrolment (e.g. a locked team seat): the page shows the lock, not a purchase.
    enrolled: Boolean(enrolment && isEnrolmentAccessAllowed(enrolment.status)),
    detail: block?.detail ?? null,
    prerequisites: block?.prerequisites ?? [],
  });
}
