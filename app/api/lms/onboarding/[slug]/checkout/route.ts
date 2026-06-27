import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  buildOnboardingCheckoutUrls,
  createOnboardingStripeCheckout,
} from '@/lib/server/onboarding-checkout';
import { getOnboardingCourseBySlug } from '@/lib/server/onboarding-programs';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { detail: 'Payments not configured. Contact CARSI to provision access.' },
      { status: 503 }
    );
  }

  const { slug: rawSlug } = await ctx.params;
  const slug = rawSlug.trim().toLowerCase();
  const course = await getOnboardingCourseBySlug(slug);
  if (!course) {
    return NextResponse.json({ detail: 'Program not found' }, { status: 404 });
  }

  const existing = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId: claims.sub, courseId: course.id } },
  });
  if (existing) {
    return NextResponse.json({ detail: 'Already enrolled in this program', enrolled: true }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    success_url?: string;
    cancel_url?: string;
  };

  const defaults = buildOnboardingCheckoutUrls(request.nextUrl.origin, slug);
  const successUrl =
    typeof body.success_url === 'string' && body.success_url.startsWith('http')
      ? body.success_url
      : defaults.success_url;
  const cancelUrl =
    typeof body.cancel_url === 'string' && body.cancel_url.startsWith('http')
      ? body.cancel_url
      : defaults.cancel_url;

  try {
    const { checkout_url } = await createOnboardingStripeCheckout({
      slug,
      title: course.title,
      shortDescription: course.shortDescription,
      meta: course.meta,
      customerEmail: claims.email ?? '',
      studentId: claims.sub,
      successUrl,
      cancelUrl,
    });
    return NextResponse.json({ checkout_url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'INVALID_AMOUNT') {
      return NextResponse.json({ detail: 'Invalid program price configuration' }, { status: 400 });
    }
    console.error('[onboarding/checkout]', e);
    return NextResponse.json({ detail: 'Could not start checkout' }, { status: 500 });
  }
}
