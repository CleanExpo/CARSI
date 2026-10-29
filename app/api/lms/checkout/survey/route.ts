/**
 * POST /api/lms/checkout/survey
 * Body: { session_id, industry?, found_via? } (allowlisted choices only; no free text)
 *
 * Saves the optional payment-success survey (Authority Machine slice 1b) onto the Stripe
 * PaymentIntent metadata. Dark unless PURCHASE_SURVEY_ENABLED (404 otherwise).
 *
 * Capability: the HttpOnly `carsi_svy` cookie the checkout route set for this session id (the id
 * alone is not enough; it travels in the success URL), and the session must be paid.
 * Write-once: a PaymentIntent that already carries `svy_at` is left unchanged, and a per-intent
 * idempotency key stops a concurrent second write. PaymentIntent
 * metadata is used because it stays writable after payment.
 *
 * Answers are never logged.
 */
import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { surveyMetadata, validateSurvey } from '@/lib/marketing/purchase-survey';
import { isPurchaseSurveyEnabled } from '@/lib/server/purchase-survey-flag';
import {
  cookieAuthorisesSession,
  PURCHASE_SURVEY_COOKIE_NAME,
} from '@/lib/server/purchase-survey-token';

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

  if (!cookieAuthorisesSession(request.cookies.get(PURCHASE_SURVEY_COOKIE_NAME)?.value, sessionId)) {
    return NextResponse.json({ detail: 'Not allowed' }, { status: 403 });
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
    // The svy_at read above cannot stop two requests that both read before either writes. The
    // idempotency key, fixed per PaymentIntent, makes Stripe refuse a second write with
    // different answers instead of overwriting the first (keys last at least 24 hours; after
    // that the svy_at check holds on its own).
    await stripe.paymentIntents.update(
      paymentIntentId,
      { metadata: surveyMetadata(validation.value, new Date()) },
      { idempotencyKey: `carsi-purchase-survey-${paymentIntentId}` }
    );
    return NextResponse.json({ saved: true });
  } catch (err) {
    if ((err as { type?: unknown })?.type === 'StripeIdempotencyError') {
      return NextResponse.json({ saved: true, already_answered: true });
    }
    const kind = err instanceof Error ? err.name : 'unknown';
    console.error('[checkout/survey] could not save survey answers:', kind);
    return NextResponse.json(
      { detail: 'Could not save your answers just now. Your course is ready.' },
      { status: 502 }
    );
  }
}
