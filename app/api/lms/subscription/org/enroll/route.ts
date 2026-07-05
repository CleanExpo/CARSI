/**
 * POST /api/lms/subscription/org/enroll — enrol a member of an active org
 * subscription in a course within the org's entitled CATEGORY, at no extra
 * charge (WS1-E3, GP-443). Body: { slug }
 *
 * Server-side ENTITLEMENT GATE for org (unlimited-seat) enrolment. FAILS CLOSED:
 *  - flag off              → 503
 *  - not signed in         → 401, no content
 *  - no active org sub     → 403, NO course payload
 *  - course not in the org's entitled category → 403 (org access is scoped to
 *    the onboarding brand, not the whole catalogue)
 *
 * Lapse gates NEW enrolments only; nothing here revokes existing access.
 */

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { getOrgEntitlements } from '@/lib/server/entitlements';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

export async function POST(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json(
      { detail: 'Organisation subscription is not yet available.' },
      { status: 503 },
    );
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: string };
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (!slug) {
    return NextResponse.json({ detail: 'Course slug is required.' }, { status: 400 });
  }

  const ent = await getOrgEntitlements(claims.sub);
  if (!ent.hasActiveOrg || !ent.entitledCategory) {
    return NextResponse.json(
      {
        detail:
          ent.reason === 'lapsed'
            ? 'Your organisation subscription has lapsed. Ask your administrator to renew — progress and certificates are retained.'
            : 'An active organisation subscription is required to enrol this way.',
        reason: ent.reason,
      },
      { status: 403 },
    );
  }

  // Scope check: org access is limited to the entitled category (the onboarding
  // brand), not the whole catalogue. Confirm the course is published AND in the
  // entitled category before granting.
  const course = await prisma.lmsCourse.findUnique({
    where: { slug },
    select: { id: true, category: true, status: true },
  });
  if (!course || course.status !== 'published') {
    return NextResponse.json(
      { detail: 'Course not found in published catalogue.' },
      { status: 404 },
    );
  }
  if ((course.category ?? '').trim() !== ent.entitledCategory.trim()) {
    return NextResponse.json(
      { detail: 'This course is not included in your organisation subscription.', reason: 'out_of_scope' },
      { status: 403 },
    );
  }

  try {
    const result = await enrollStudentInCourse(claims, slug, `org:${ent.teamId}`);
    const learnPath = (await getFirstLessonLearnPath(slug)) ?? '/dashboard/student';

    if (result !== 'already_enrolled') {
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        appOrigin: request.nextUrl.origin,
      }).catch((e) => console.error('[subscription/org/enroll] email', e));
      notifyCrmEnrollmentCreated({
        enrollmentId: result.enrollmentId,
        studentId: claims.sub,
        courseId: result.courseId,
      });
    }

    return NextResponse.json({
      ok: true,
      already_enrolled: result === 'already_enrolled',
      learn_url: learnPath,
      included_in_membership: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'COURSE_NOT_FOUND') {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    console.error('[subscription/org/enroll]', e);
    return NextResponse.json({ detail: 'Enrolment failed' }, { status: 500 });
  }
}
