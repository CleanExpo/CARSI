import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { parseOnboardingMeta } from '@/lib/onboarding/enterprise';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  buildOnboardingCheckoutUrls,
  createOnboardingStripeCheckout,
} from '@/lib/server/onboarding-checkout';
import { getOnboardingCourseBySlug } from '@/lib/server/onboarding-programs';
import { resolveOrgMonthlyPriceId } from '@/lib/server/org-subscription-price';
import { provisionOrgSubscriptionContainer } from '@/lib/server/org-subscription-provision';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';
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
      { status: 503 },
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
    return NextResponse.json(
      { detail: 'Already enrolled in this program', enrolled: true },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    success_url?: string;
    cancel_url?: string;
    organisation_name?: string;
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

  const meta = parseOnboardingMeta(course.meta);
  const organisationName = (
    body.organisation_name?.trim() ||
    meta?.company?.trim() ||
    course.title.replace(/^CARSI Maintenance Company Onboarding — /, '').trim()
  ).slice(0, 200);

  if (subscriptionsEnabled()) {
    const priceId = await resolveOrgMonthlyPriceId();
    if (priceId) {
      if (organisationName.length < 2) {
        return NextResponse.json({ detail: 'Organisation name is required.' }, { status: 400 });
      }

      const contactEmail = claims.email?.trim().toLowerCase() ?? '';
      let teamId: string;
      try {
        const provisioned = await provisionOrgSubscriptionContainer({
          ownerId: claims.sub,
          organisationName,
          contactEmail,
        });
        teamId = provisioned.teamId;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'ALREADY_ON_TEAM') {
          return NextResponse.json(
            {
              detail:
                'You are already on a team. Contact CARSI support to provision organisation access.',
            },
            { status: 409 },
          );
        }
        console.error('[onboarding/checkout] org provision failed:', e);
        return NextResponse.json({ detail: 'Could not start checkout' }, { status: 500 });
      }

      try {
        const session = await getStripeClient().checkout.sessions.create({
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: contactEmail || undefined,
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            carsi_user_id: claims.sub,
            carsi_team_id: teamId,
            plan: 'org_monthly',
            organisation_name: organisationName,
            onboarding_slug: slug,
            source: 'carsi-org-subscription',
          },
          subscription_data: {
            metadata: {
              carsi_user_id: claims.sub,
              carsi_team_id: teamId,
              plan: 'org_monthly',
              onboarding_slug: slug,
            },
          },
          allow_promotion_codes: true,
        });

        if (!session.url) {
          return NextResponse.json({ detail: 'Could not start checkout' }, { status: 500 });
        }
        return NextResponse.json({ checkout_url: session.url });
      } catch (e) {
        console.error('[onboarding/checkout] org Stripe session failed:', e);
        return NextResponse.json({ detail: 'Could not start checkout' }, { status: 500 });
      }
    }
  }

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
