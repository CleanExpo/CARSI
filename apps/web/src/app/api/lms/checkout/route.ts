/**
 * GP-268: CARSI Stripe Checkout — Next.js API proxy
 *
 * POST /api/lms/checkout
 * Body: { slug: string }
 *
 * Proxies to the Python backend's /api/lms/courses/{slug}/checkout
 * which handles Stripe session creation and free-course enrolment.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamBaseUrl, upstreamNotConfigured } from '@/lib/server/upstream-api';

export async function POST(request: NextRequest) {
  const upstream = getUpstreamBaseUrl();
  if (!upstream) return upstreamNotConfigured();

  try {
    const { slug } = await request.json();

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Course slug is required' }, { status: 400 });
    }

    // Forward auth headers from the client
    const userId = request.headers.get('x-user-id') ?? '';
    const authHeader = request.headers.get('authorization') ?? '';

    const backendRes = await fetch(
      `${upstream.replace(/\/$/, '')}/api/lms/courses/${slug}/checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'X-User-Id': userId }),
          ...(authHeader && { Authorization: authHeader }),
        },
      }
    );

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[GP-268] Checkout proxy error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
