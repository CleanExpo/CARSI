import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';

/** GET /api/lms/checkout/session?session_id= — paid session email for guest account setup (no auth). */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')?.trim();
  if (!sessionId) {
    return NextResponse.json({ detail: 'session_id required' }, { status: 400 });
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
    const email =
      session.customer_email ?? session.customer_details?.email ?? '';
    const slug = session.metadata?.course_slug ?? '';
    return NextResponse.json({
      email: email.trim().toLowerCase(),
      course_slug: slug,
      guest_checkout: session.metadata?.guest_checkout === 'true',
      purchase_mode: session.metadata?.purchase_mode === 'team' ? 'team' : 'self',
      team_seat_count: session.metadata?.team_seat_count
        ? Number.parseInt(session.metadata.team_seat_count, 10)
        : undefined,
    });
  } catch {
    return NextResponse.json({ detail: 'Invalid session' }, { status: 400 });
  }
}
