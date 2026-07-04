/**
 * POST /api/lms/subscription/enroll — enrol an ACTIVE member in a published
 * course at no extra charge (the "included in your membership" path).
 * Body: { slug }
 *
 * This is the server-side ENTITLEMENT GATE for membership-based enrolment
 * (WS1-E1, GP-441, spec §15 AC2/AC3/AC5). It FAILS CLOSED at every step:
 *  - feature flag off            → 503 (coming-soon behaviour)
 *  - not signed in               → 401, no content
 *  - not entitled (lapsed/none)  → 403 with a renew hint, NO course payload
 *  - lapse within grace          → still entitled (7-day grace)
 *
 * It never grants a course this way for a NON-member — a non-member must still
 * buy the course one-off via /api/lms/checkout (that flow is untouched). Lapse
 * gates NEW enrolments only; nothing here revokes an existing enrolment,
 * progress, or an issued certificate.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { getEntitlements } from '@/lib/server/entitlements';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import { getPublishedCourseForCheckout } from '@/lib/server/public-courses-list';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

export async function POST(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json(
      { detail: 'Membership is not yet available.' },
      { status: 503 },
    );
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    // Fail closed: no session → 401, no course content.
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

  // Entitlement gate — the whole point of this route. getEntitlements fails
  // closed (returns not-entitled) on any data error.
  const ent = await getEntitlements(claims.sub);
  if (!ent.hasActiveMembership) {
    return NextResponse.json(
      {
        detail:
          ent.reason === 'lapsed'
            ? 'Your membership has lapsed. Renew to enrol in new courses — your progress and certificates are retained.'
            : 'An active membership is required to enrol this way.',
        reason: ent.reason,
        renew_url: '/subscribe',
      },
      { status: 403 },
    );
  }

  // Confirm the course is real + published before granting access.
  const course = await getPublishedCourseForCheckout(slug);
  if (!course) {
    return NextResponse.json(
      { detail: 'Course not found in published catalogue.' },
      { status: 404 },
    );
  }

  try {
    const result = await enrollStudentInCourse(claims, slug, `membership:${claims.sub}`);
    const learnPath = (await getFirstLessonLearnPath(slug)) ?? '/dashboard/student';

    if (result !== 'already_enrolled') {
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        appOrigin: request.nextUrl.origin,
      }).catch((e) => console.error('[subscription/enroll] email', e));
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
    console.error('[subscription/enroll]', e);
    return NextResponse.json({ detail: 'Enrolment failed' }, { status: 500 });
  }
}
