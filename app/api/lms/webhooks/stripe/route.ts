/**
 * POST /api/lms/webhooks/stripe
 *
 * Verifies Stripe signatures and completes course enrolment for paid checkout sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { constructWebhookEvent } from '@/lib/api/stripe';
import { processCcwRoadshowBookingConfirmation } from '@/lib/server/ccw-roadshow-booking-email';
import { getAppOrigin } from '@/lib/server/app-url';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { ensureGuestUserFromStripeEmail } from '@/lib/server/guest-checkout';
import { sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';
import { fulfillCourseCheckoutForUser } from '@/lib/server/team-course-purchase';
import { shouldRetryWebhookFulfillment } from '@/lib/server/stripe-webhook-policy';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const stripeSignature = request.headers.get('stripe-signature') ?? '';

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json(
      { error: 'Stripe webhook not configured (STRIPE_WEBHOOK_SECRET).' },
      { status: 503 }
    );
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, stripeSignature);
  } catch (e) {
    console.error('[stripe webhook] signature verification failed:', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status && session.payment_status !== 'paid') {
    return NextResponse.json({ received: true });
  }

  if (session.metadata?.source === 'carsi-ccw-roadshow') {
    try {
      await processCcwRoadshowBookingConfirmation(session, {
        appOrigin: getAppOrigin(),
      });
    } catch {
      // Errors logged in sendCcwRoadshowBookingConfirmationEmail
    }
    return NextResponse.json({ received: true });
  }

  const slug = session.metadata?.course_slug?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ received: true });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const studentIdMeta = session.metadata?.student_id?.trim();
  const email =
    (session.customer_email ?? session.customer_details?.email)?.trim().toLowerCase() ?? '';

  let claims = studentIdMeta ? await sessionClaimsForUserId(studentIdMeta) : null;
  if (!claims && email) {
    const user = await prisma.lmsUser.findUnique({ where: { email } });
    if (user) claims = await sessionClaimsForUserId(user.id);
  }
  if (!claims && email && session.metadata?.guest_checkout === 'true') {
    claims = await ensureGuestUserFromStripeEmail(email);
  }

  if (!claims) {
    console.warn('[stripe webhook] checkout.session.completed: could not resolve learner', {
      slug,
      hasStudentMeta: Boolean(studentIdMeta),
      hasEmail: Boolean(email),
    });
    return NextResponse.json({ received: true });
  }

  const purchaseMode = session.metadata?.purchase_mode === 'team' ? 'team' : 'self';
  const teamSeatRaw = session.metadata?.team_seat_count;
  const teamSeatCount = teamSeatRaw ? Number.parseInt(teamSeatRaw, 10) : undefined;

  try {
    const ref = typeof session.id === 'string' ? session.id : 'stripe_webhook';
    const origin = getAppOrigin();
    const fulfilled = await fulfillCourseCheckoutForUser({
      claims,
      courseSlug: slug,
      paymentReference: ref,
      purchaseMode,
      teamSeatCount: Number.isFinite(teamSeatCount) ? teamSeatCount : undefined,
    });

    if (!fulfilled.alreadyEnrolled && fulfilled.enrollmentId && fulfilled.courseId) {
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        appOrigin: origin,
      }).catch((e) => console.error('[stripe webhook] email', e));
      notifyCrmEnrollmentCreated({
        enrollmentId: fulfilled.enrollmentId,
        studentId: claims.sub,
        courseId: fulfilled.courseId,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (shouldRetryWebhookFulfillment(msg)) {
      // Transient/unexpected failure — return 5xx so Stripe retries instead of
      // silently dropping a paid enrolment.
      console.error('[stripe webhook] enrolment error (returning 500 so Stripe retries):', e);
      return NextResponse.json({ error: 'Enrolment failed; Stripe will retry.' }, { status: 500 });
    }
    // Terminal business condition — acknowledge so Stripe does not retry.
    console.warn('[stripe webhook] team purchase blocked: user on another team');
  }

  return NextResponse.json({ received: true });
}
