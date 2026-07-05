/**
 * POST /api/lms/subscription/teams/enroll — enrol a SEATED team member in a
 * published course at no extra charge (WS1-E2, GP-442). Body: { slug }
 *
 * This is the server-side ENTITLEMENT GATE for Teams seat-based enrolment. It
 * FAILS CLOSED at every step:
 *  - flag off                      → 503
 *  - not signed in                 → 401, no content
 *  - no entitled seat (lapsed/full)→ 403 with a hint, NO course payload
 *
 * A seat entitles the WHOLE published catalogue (like the individual
 * membership). Seat exhaustion beyond the paid limit → not entitled (the owner
 * must expand seats). Lapse gates NEW enrolments only; nothing here revokes an
 * existing enrolment, progress, or an issued certificate.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { getTeamEntitlements } from '@/lib/server/entitlements';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import { getPublishedCourseForCheckout } from '@/lib/server/public-courses-list';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

export async function POST(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json({ detail: 'Teams membership is not yet available.' }, { status: 503 });
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

  // Entitlement gate — getTeamEntitlements fails closed (not-entitled) on error.
  const ent = await getTeamEntitlements(claims.sub);
  if (!ent.hasActiveSeat) {
    return NextResponse.json(
      {
        detail:
          ent.reason === 'seat_full'
            ? 'Your team has no seat available for you. Ask the owner to add seats.'
            : ent.reason === 'lapsed'
              ? 'Your team membership has lapsed. Ask the owner to renew — your progress and certificates are retained.'
              : 'An active team seat is required to enrol this way.',
        reason: ent.reason,
      },
      { status: 403 },
    );
  }

  const course = await getPublishedCourseForCheckout(slug);
  if (!course) {
    return NextResponse.json(
      { detail: 'Course not found in published catalogue.' },
      { status: 404 },
    );
  }

  try {
    const result = await enrollStudentInCourse(claims, slug, `team-seat:${ent.teamId}`);
    const learnPath = (await getFirstLessonLearnPath(slug)) ?? '/dashboard/student';

    if (result !== 'already_enrolled') {
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        appOrigin: request.nextUrl.origin,
      }).catch((e) => console.error('[subscription/teams/enroll] email', e));
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
    console.error('[subscription/teams/enroll]', e);
    return NextResponse.json({ detail: 'Enrolment failed' }, { status: 500 });
  }
}
