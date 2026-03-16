/**
 * GP-268: Stripe Webhook — Next.js passthrough
 *
 * POST /api/lms/webhooks/stripe
 *
 * Proxies raw body to the Python backend /api/lms/webhooks/stripe
 * which handles Stripe signature verification and event processing.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // Pass raw body and Stripe signature header through
    const rawBody = await request.arrayBuffer();
    const stripeSignature = request.headers.get('stripe-signature') ?? '';

    const backendRes = await fetch(`${BACKEND_URL}/api/lms/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': stripeSignature,
      },
      body: rawBody,
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error('[GP-268] Stripe webhook proxy error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
