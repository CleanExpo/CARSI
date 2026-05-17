/**
 * POST /api/lms/webhooks/stripe
 *
 * Verifies Stripe signatures and completes course enrolment for paid checkout sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { constructWebhookEvent } from '@/lib/api/stripe';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { ensureGuestUserFromStripeEmail } from '@/lib/server/guest-checkout';
import { sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';

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

  try {
    const ref = typeof session.id === 'string' ? session.id : 'stripe_webhook';
    const result = await enrollStudentInCourse(claims, slug, ref);
    if (result !== 'already_enrolled') {
      const origin =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() ||
        'https://carsi.com.au';
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        origin,
      }).catch((e) => console.error('[stripe webhook] email', e));
    }
  } catch (e) {
    console.error('[stripe webhook] enrolment error:', e);
  }

  return NextResponse.json({ received: true });
}
