import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { confirmEmailOwnershipOk, resolveAccountEmail } from '@/lib/server/enrollment-confirm-guard';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { captureServerError } from '@/lib/server/sentry';
import { fulfillCourseCheckoutForUser } from '@/lib/server/team-course-purchase';
import { computeDiscountedAud, findActiveUserDiscount } from '@/lib/server/user-discounts';
import { getOrCreateCourseBySlug } from '@/lib/server/course-catalog-sync';

/**
 * Finalise enrolment after Stripe Checkout (session_id) or confirm free enrolment
 * (catalog free, or admin "100% free" discount).
 */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const json = (await request.json().catch(() => ({}))) as {
    slug?: string;
    session_id?: string;
  };

  let slug = typeof json.slug === 'string' ? json.slug.trim().toLowerCase() : '';
  const sessionId = typeof json.session_id === 'string' ? json.session_id.trim() : '';

  let paymentReference: string;
  let purchaseMode: 'self' | 'team' = 'self';
  let teamSeatCount: number | undefined;

  if (sessionId) {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json({ detail: 'Stripe not configured' }, { status: 503 });
    }
    // WS5: resolve the account email BEFORE calling Stripe, so a DB fault surfaces
    // as a real error rather than being mislabeled 'invalid checkout session'.
    const accountEmail = await resolveAccountEmail(
      claims.email,
      async () =>
        (await prisma.lmsUser.findUnique({ where: { id: claims.sub }, select: { email: true } }))
          ?.email ?? null,
    );
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ detail: 'Payment not completed' }, { status: 400 });
      }
      const metaSlug = session.metadata?.course_slug?.trim().toLowerCase();
      if (!metaSlug) {
        return NextResponse.json({ detail: 'Missing course on session' }, { status: 400 });
      }
      slug = metaSlug;
      purchaseMode = session.metadata?.purchase_mode === 'team' ? 'team' : 'self';
      const seatsMeta = session.metadata?.team_seat_count;
      if (seatsMeta) {
        const n = Number.parseInt(seatsMeta, 10);
        if (Number.isFinite(n)) teamSeatCount = n;
      }
      // WS5: UNCONDITIONAL payer-email ownership check (fail closed) — a token
      // without an email claim can't finalise a session paid under another email.
      const sessionEmail = session.customer_email ?? session.customer_details?.email;
      if (!confirmEmailOwnershipOk(sessionEmail, accountEmail)) {
        return NextResponse.json({ detail: 'Session email does not match account' }, { status: 403 });
      }
    } catch (e) {
      console.error('[enrollments/confirm] stripe', e);
      void captureServerError(e, { route: '/api/lms/enrollments/confirm' });
      return NextResponse.json({ detail: 'Invalid checkout session' }, { status: 400 });
    }
    paymentReference = sessionId;
  } else {
    if (!slug) {
      return NextResponse.json({ detail: 'slug or session_id required' }, { status: 400 });
    }

    let dbCourse: { id: string; priceAud: unknown; isFree: boolean };
    try {
      dbCourse = await getOrCreateCourseBySlug(slug);
    } catch {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }

    const listAud = Number(dbCourse.priceAud);
    const isFreeCatalog =
      dbCourse.isFree === true || !Number.isFinite(listAud) || listAud <= 0;

    if (isFreeCatalog) {
      paymentReference = 'free';
    } else {
      const disc = await findActiveUserDiscount(claims.sub, dbCourse.id);
      if (disc) {
        const listAud = Number(dbCourse.priceAud);
        const finalAud = computeDiscountedAud(listAud, disc);
        if (disc.discountType === 'free' || finalAud <= 0) {
          paymentReference = `discount:${disc.id}`;
        } else {
          return NextResponse.json(
            { detail: 'Paid courses require a valid Stripe session_id' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { detail: 'Paid courses require a valid Stripe session_id' },
          { status: 403 }
        );
      }
    }
  }

  if (!slug) {
    return NextResponse.json({ detail: 'Course slug required' }, { status: 400 });
  }

  try {
    const fulfilled = await fulfillCourseCheckoutForUser({
      claims,
      courseSlug: slug,
      paymentReference,
      purchaseMode,
      teamSeatCount,
    });

    if (!fulfilled.alreadyEnrolled && fulfilled.enrollmentId && fulfilled.courseId) {
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        appOrigin: request.nextUrl.origin,
      }).catch((e) => console.error('[enrollments/confirm] email', e));

      notifyCrmEnrollmentCreated({
        enrollmentId: fulfilled.enrollmentId,
        studentId: claims.sub,
        courseId: fulfilled.courseId,
      });
    }

    return NextResponse.json({
      ok: true,
      already_enrolled: fulfilled.alreadyEnrolled,
      learn_url: fulfilled.redirectPath,
      team_purchase: fulfilled.kind === 'team',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'COURSE_NOT_FOUND') {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    if (msg === 'ALREADY_ON_TEAM') {
      return NextResponse.json(
        { detail: 'You already belong to another team. Contact support to move your purchase.' },
        { status: 409 },
      );
    }
    console.error('[enrollments/confirm]', e);
    void captureServerError(e, { route: '/api/lms/enrollments/confirm' });
    return NextResponse.json({ detail: 'Enrolment failed' }, { status: 500 });
  }
}
