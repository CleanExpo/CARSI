/**
 * POST /api/lms/checkout/survey
 * Body: { session_id, industry?, industry_other?, found_via?, found_via_other? }
 *
 * Saves the optional payment-success survey (Authority Machine slice 1b) onto the Stripe
 * PaymentIntent metadata. Dark unless PURCHASE_SURVEY_ENABLED (404 otherwise).
 *
 * Capability: a paid Checkout Session id, the same check as GET /api/lms/checkout/session.
 * Write-once: a PaymentIntent that already carries `svy_at` is left unchanged. PaymentIntent
 * metadata is used because it stays writable after payment.
 *
 * Answers are never logged.
 */
import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { surveyMetadata, validateSurvey } from '@/lib/marketing/purchase-survey';
import { isPurchaseSurveyEnabled } from '@/lib/server/purchase-survey-flag';

const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{1,250}$/;

export async function POST(request: NextRequest) {
  if (!isPurchaseSurveyEnabled()) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ detail: 'Invalid request' }, { status: 400 });
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return NextResponse.json({ detail: 'session_id required' }, { status: 400 });
  }

  const validation = validateSurvey(body);
  if (!validation.ok) {
    return NextResponse.json({ detail: validation.error }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json({ detail: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = getStripeClient();

  let paymentIntentId: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ detail: 'Payment not completed' }, { status: 400 });
    }
    const pi = session.payment_intent;
    paymentIntentId = typeof pi === 'string' ? pi : (pi?.id ?? null);
  } catch {
    return NextResponse.json({ detail: 'Invalid session' }, { status: 400 });
  }

  if (!paymentIntentId) {
    return NextResponse.json({ detail: 'No payment to attach answers to' }, { status: 409 });
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.metadata?.svy_at) {
      return NextResponse.json({ saved: true, already_answered: true });
    }
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: surveyMetadata(validation.value, new Date()),
    });
    return NextResponse.json({ saved: true });
  } catch (err) {
    const kind = err instanceof Error ? err.name : 'unknown';
    console.error('[checkout/survey] could not save survey answers:', kind);
    return NextResponse.json(
      { detail: 'Could not save your answers just now. Your course is ready.' },
      { status: 502 }
    );
  }
}
