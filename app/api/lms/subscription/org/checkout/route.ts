/**
 * POST /api/lms/subscription/org/checkout — start the organisation monthly
 * subscription (WS1-E3, GP-443) — A$1,295/month + GST, unlimited learners.
 *
 * Body: { organisation_name: string, contact_email?, success_url?, cancel_url? }
 *
 * Executes docs/plans/2026-06-27-org-subscription-billing.md: a recurring
 * monthly Price (resolved by lookup_key `carsi_org_monthly`), a `mode:
 * 'subscription'` checkout, and an `LmsOrgSubscription` row provisioned up front
 * so the webhook can map the subscription back to the org and refresh its
 * lifecycle. Reuses `LmsTeam` as the org container (unlimited seats).
 *
 * Ships DARK behind SUBSCRIPTIONS_ENABLED and FAILS CLOSED at every uncertain
 * step (flag off / not signed in / Stripe unconfigured / Price unresolvable).
 */

import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { resolveOrgMonthlyPriceId } from '@/lib/server/org-subscription-price';
import { provisionOrgSubscriptionContainer } from '@/lib/server/org-subscription-provision';
import {
  checkoutSessionIdempotencyKey,
  checkoutSessionExpiresAt,
} from '@/lib/server/membership-checkout-reservation';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const UNAVAILABLE = 'Organisation subscription purchasing is not yet available.';

export async function POST(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json(
      { detail: 'Sign in to start an organisation subscription.' },
      { status: 401 }
    );
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { detail: 'Payments not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 }
    );
  }

  const priceId = await resolveOrgMonthlyPriceId();
  if (!priceId) {
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    organisation_name?: string;
    contact_email?: string;
    success_url?: string;
    cancel_url?: string;
  };

  const organisationName = (body.organisation_name ?? '').trim();
  if (organisationName.length < 2) {
    return NextResponse.json({ detail: 'Organisation name is required.' }, { status: 400 });
  }
  const contactEmail =
    typeof body.contact_email === 'string' && body.contact_email.includes('@')
      ? body.contact_email.trim().toLowerCase()
      : (claims.email ?? '');

  let teamId: string;
  const reservedAt = new Date();
  try {
    const provisioned = await provisionOrgSubscriptionContainer({
      ownerId: claims.sub,
      organisationName,
      contactEmail,
      reservedAt,
    });
    if (!provisioned.ok) {
      // The container is claimed by another in-flight checkout, or the database
      // could not say. Either way, open no second Stripe session.
      return provisioned.reason === 'busy'
        ? NextResponse.json(
            {
              detail:
                'An organisation checkout is already open for your account. Finish it, or try again in a few minutes.',
            },
            { status: 409 }
          )
        : NextResponse.json(
            { detail: 'We could not start checkout just now. Please try again shortly.' },
            { status: 503 }
          );
    }
    teamId = provisioned.result.teamId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'ALREADY_ON_TEAM') {
      return NextResponse.json(
        {
          detail:
            'You are already a member of a team. Leave it before starting an organisation subscription.',
        },
        { status: 409 }
      );
    }
    console.error('[subscription/org/checkout] provision failed:', e);
    return NextResponse.json({ detail: 'Failed to start checkout.' }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const success_url =
    typeof body.success_url === 'string' && body.success_url.startsWith('http')
      ? body.success_url
      : `${origin}/dashboard/team?org_subscription=active`;
  const cancel_url =
    typeof body.cancel_url === 'string' && body.cancel_url.startsWith('http')
      ? body.cancel_url
      : `${origin}/pricing?checkout=cancelled`;

  try {
    const session = await getStripeClient().checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        // Paired with the reservation TTL — see membership-checkout-reservation.
        expires_at: checkoutSessionExpiresAt(reservedAt),
        customer_email: contactEmail || claims.email,
        success_url,
        cancel_url,
        metadata: {
          carsi_user_id: claims.sub,
          carsi_team_id: teamId,
          plan: 'org_monthly',
          organisation_name: organisationName.slice(0, 200),
          source: 'carsi-org-subscription',
        },
        subscription_data: {
          metadata: {
            carsi_user_id: claims.sub,
            carsi_team_id: teamId,
            plan: 'org_monthly',
          },
        },
        allow_promotion_codes: true,
      },
      {
        idempotencyKey: checkoutSessionIdempotencyKey('org', teamId, reservedAt),
      }
    );

    if (!session.url) {
      return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
    }
    return NextResponse.json({ url: session.url, checkout_url: session.url, team_id: teamId });
  } catch (error) {
    // Stripe may have accepted the session before a timeout or 5xx. Keep the
    // reservation until the paired TTL expires so a retry cannot double-bill.
    console.error('[subscription/org/checkout] Stripe error:', error);
    return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
  }
}
