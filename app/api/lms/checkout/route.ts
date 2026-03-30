/**
 * POST /api/lms/checkout
 * Body: { slug, success_url?, cancel_url?, customer_email? }
 *
 * Stripe Checkout via STRIPE_SECRET_KEY + local catalog (WordPress export); enrolment finalised in-app.
 */

import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';
import { buildCourseCheckoutUrls } from '@/lib/checkout-urls';
import {
  createStripeCheckoutForCourse,
  findCourseInExport,
  resolveCheckoutEmail,
} from '@/lib/server/local-course-checkout';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      slug?: string;
      success_url?: string;
      cancel_url?: string;
      customer_email?: string;
    };

    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) {
      return NextResponse.json({ error: 'Course slug is required' }, { status: 400 });
    }

    const origin = request.nextUrl.origin;
    const defaults = buildCourseCheckoutUrls(origin, slug);
    const success_url =
      typeof body.success_url === 'string' && body.success_url.startsWith('http')
        ? body.success_url
        : defaults.success_url;
    const cancel_url =
      typeof body.cancel_url === 'string' && body.cancel_url.startsWith('http')
        ? body.cancel_url
        : defaults.cancel_url;

    const authHeader = request.headers.get('authorization') ?? '';
    const authTokenCookie = request.cookies.get('auth_token')?.value;

    const customerEmail = await resolveCheckoutEmail({
      authTokenCookie,
      authorizationHeader: authHeader,
      bodyEmail: body.customer_email,
    });

    let studentId: string | undefined;
    if (authTokenCookie) {
      const c = await verifySessionToken(authTokenCookie);
      if (c?.sub) studentId = c.sub;
    }

    // --- Local Stripe + WordPress export ---
    if (!customerEmail) {
      return NextResponse.json(
        {
          detail:
            'Sign in required, or pass customer_email after registration. Try the Enrol button again.',
        },
        { status: 401 }
      );
    }

    const course = findCourseInExport(slug);
    if (!course) {
      return NextResponse.json(
        { detail: 'Course not found in local catalog (wordpress export).' },
        { status: 404 }
      );
    }

    const priceNum = Number(course.price_aud);
    const isFree = course.is_free === true || !Number.isFinite(priceNum) || priceNum <= 0;
    if (isFree) {
      return NextResponse.json({ enrolled: true });
    }

    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        {
          detail:
            'Payments not configured. Set STRIPE_SECRET_KEY for LMS checkout.',
        },
        { status: 503 }
      );
    }

    try {
      const { checkout_url } = await createStripeCheckoutForCourse({
        slug,
        course,
        success_url,
        cancel_url,
        customer_email: customerEmail,
        student_id: studentId,
      });
      return NextResponse.json({ checkout_url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'INVALID_AMOUNT') {
        return NextResponse.json(
          { detail: 'Course price is too low or invalid for card checkout.' },
          { status: 400 }
        );
      }
      if (msg.includes('Stripe secret key not configured')) {
        return NextResponse.json({ detail: 'STRIPE_SECRET_KEY is not set.' }, { status: 503 });
      }
      console.error('[checkout] local Stripe error:', err);
      return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
    }
  } catch (error) {
    console.error('[checkout] error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
