import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken } from '@/lib/auth/session-jwt';
import { getStripeClient } from '@/lib/api/stripe';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { findOrCreateGuestUser } from '@/lib/server/guest-checkout';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * POST /api/lms/enrollments/guest-complete
 * After Stripe payment without prior login: set password, create/find user, enrol, session cookie.
 */
export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    session_id?: string;
    password?: string;
    full_name?: string;
  };

  const sessionId = body.session_id?.trim();
  const password = body.password ?? '';
  const fullName = body.full_name?.trim() ?? '';

  if (!sessionId || password.length < 8) {
    return NextResponse.json(
      { detail: 'session_id and password (min 8 characters) required' },
      { status: 400 },
    );
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json({ detail: 'Stripe not configured' }, { status: 503 });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ detail: 'Payment not completed' }, { status: 400 });
    }

    const slug = session.metadata?.course_slug?.trim().toLowerCase();
    const email = (
      session.customer_email ??
      session.customer_details?.email ??
      ''
    )
      .trim()
      .toLowerCase();

    if (!slug || !email) {
      return NextResponse.json({ detail: 'Invalid checkout session' }, { status: 400 });
    }

    const { claims } = await findOrCreateGuestUser({
      email,
      fullName: fullName || email.split('@')[0],
      password,
    });

    const result = await enrollStudentInCourse(claims, slug, sessionId);
    const alreadyEnrolled = result === 'already_enrolled';
    const origin = request.nextUrl.origin;
    const learnPath = (await getFirstLessonLearnPath(slug)) ?? '/dashboard/student';

    if (!alreadyEnrolled) {
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        origin,
      }).catch((e) => console.error('[guest-complete] email', e));

      notifyCrmEnrollmentCreated({
        enrollmentId: result.enrollmentId,
        studentId: claims.sub,
        courseId: result.courseId,
      });
    }

    const accessToken = await signSessionToken(claims);
    const response = NextResponse.json({
      ok: true,
      learn_url: learnPath,
      already_enrolled: alreadyEnrolled,
    });

    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    };
    response.cookies.set('auth_token', accessToken, { ...cookieOptions, httpOnly: true });
    response.cookies.set('carsi_token', accessToken, { ...cookieOptions, httpOnly: false });

    return response;
  } catch (e) {
    console.error('[guest-complete]', e);
    return NextResponse.json({ detail: 'Could not complete enrolment' }, { status: 500 });
  }
}
