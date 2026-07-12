import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken } from '@/lib/auth/session-jwt';
import { getStripeClient } from '@/lib/api/stripe';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { findOrCreateGuestUser } from '@/lib/server/guest-checkout';
import { captureServerError } from '@/lib/server/sentry';
import { getTeamForUser } from '@/lib/server/teams';
import { fulfillCourseCheckoutForUser } from '@/lib/server/team-course-purchase';
import { prisma } from '@/lib/prisma';

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
    team_name?: string;
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

    // Stripe-verified payer email: allow claiming an *unclaimed provisional*
    // account (one auto-created by the webhook for this purchase), but NEVER
    // overwrite the password of, or mint a session for, an *established* account.
    // The Stripe customer email is not proof the caller controls that inbox, so
    // an existing real account must sign in — its enrolment is granted
    // idempotently by the checkout.session.completed webhook regardless.
    const outcome = await findOrCreateGuestUser({
      email,
      fullName: fullName || email.split('@')[0],
      password,
      allowClaim: true,
    });

    if (outcome.status === 'exists') {
      return NextResponse.json({
        ok: true,
        requires_sign_in: true,
        learn_url: `/login?next=${encodeURIComponent(`/courses/${slug}`)}`,
      });
    }

    const { claims } = outcome;

    const purchaseMode = session.metadata?.purchase_mode === 'team' ? 'team' : 'self';
    const seatsMeta = session.metadata?.team_seat_count;
    const teamSeatCount = seatsMeta ? Number.parseInt(seatsMeta, 10) : undefined;

    const fulfilled = await fulfillCourseCheckoutForUser({
      claims,
      courseSlug: slug,
      paymentReference: sessionId,
      purchaseMode,
      teamSeatCount: Number.isFinite(teamSeatCount) ? teamSeatCount : undefined,
    });

    const teamName = typeof body.team_name === 'string' ? body.team_name.trim() : '';
    if (purchaseMode === 'team' && teamName.length >= 2) {
      const ownedTeam = await getTeamForUser(claims.sub);
      if (ownedTeam && ownedTeam.ownerId === claims.sub) {
        await prisma.lmsTeam.update({
          where: { id: ownedTeam.id },
          data: { name: teamName.slice(0, 80) },
        });
      }
    }

    const origin = request.nextUrl.origin;

    if (!fulfilled.alreadyEnrolled && fulfilled.enrollmentId && fulfilled.courseId) {
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        appOrigin: origin,
      }).catch((e) => console.error('[guest-complete] email', e));

      notifyCrmEnrollmentCreated({
        enrollmentId: fulfilled.enrollmentId,
        studentId: claims.sub,
        courseId: fulfilled.courseId,
      });
    }

    const accessToken = await signSessionToken(claims);
    const response = NextResponse.json({
      ok: true,
      learn_url:
        fulfilled.kind === 'team'
          ? `/dashboard/team?from_purchase=1&course=${encodeURIComponent(slug)}${Number.isFinite(teamSeatCount) ? `&seats=${teamSeatCount}` : ''}`
          : fulfilled.redirectPath,
      team_purchase: fulfilled.kind === 'team',
      already_enrolled: fulfilled.alreadyEnrolled,
    });

    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    };
    response.cookies.set('auth_token', accessToken, { ...cookieOptions, httpOnly: true });
    response.cookies.set('carsi_token', accessToken, { ...cookieOptions, httpOnly: true });

    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'ALREADY_ON_TEAM') {
      return NextResponse.json(
        { detail: 'You already belong to another team. Contact support@carsi.com.au' },
        { status: 409 },
      );
    }
    console.error('[guest-complete]', e);
    void captureServerError(e, { route: '/api/lms/enrollments/guest-complete' });
    return NextResponse.json({ detail: 'Could not complete enrolment' }, { status: 500 });
  }
}
