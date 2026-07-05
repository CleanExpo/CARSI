/**
 * POST /api/lms/subscription/teams/checkout — start a Teams SEAT subscription
 * (WS1-E2, GP-442) Stripe Checkout in `mode: 'subscription'`.
 *
 * Body: { tier: 'starter' | 'growth' | 'full_library', success_url?, cancel_url? }
 *
 * Seat-billing decision (documented in the PR): ONE recurring Price per tier;
 * the seat count is the Stripe subscription `quantity`. The tier's included seat
 * count (5 / 15 / 25) is the initial quantity; seat expansion is a quantity
 * increase with proration (handled by the seat-expansion route). This is the
 * simplest correct model — no per-seat Price, no bespoke proration maths.
 *
 * Ships DARK behind SUBSCRIPTIONS_ENABLED and FAILS CLOSED at every uncertain
 * step (flag off / not signed in / Stripe unconfigured / Price unresolvable /
 * already on another team) — exactly the E1 pattern.
 *
 * The team is provisioned up front (owner-only, seat_limit = included seats) so
 * the Stripe subscription can carry `carsi_team_id`, letting the webhook map the
 * subscription back to the team. The seat_limit becomes authoritative once the
 * subscription webhook confirms the paid quantity.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { teamTierById, type TeamBundleTierId } from '@/lib/lms/pricing-tiers';
import { resolveTeamTierPriceId } from '@/lib/server/team-subscription-price';
import { createTeamForOwner, getTeamForUser } from '@/lib/server/teams';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const UNAVAILABLE = 'Teams membership purchasing is not yet available.';
const TEAMS_SUBSCRIPTION_TIER = 'teams_subscription';

export async function POST(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in to start a Teams membership.' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { detail: 'Payments not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    tier?: string;
    success_url?: string;
    cancel_url?: string;
  };

  const tierId = (body.tier ?? '').trim().toLowerCase() as TeamBundleTierId;
  const tier = teamTierById(tierId);
  if (!tier) {
    return NextResponse.json({ detail: 'Unknown Teams tier.' }, { status: 400 });
  }

  const priceId = await resolveTeamTierPriceId(tierId);
  if (!priceId) {
    // Fail closed: no Price → honest unavailable, never a wrong Price.
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  // A user may own at most one team. If they already belong to a team they do
  // not own, block (they cannot start a second). If they own one, reuse it.
  const existing = await getTeamForUser(claims.sub);
  let teamId: string;
  if (existing) {
    if (existing.ownerId !== claims.sub) {
      return NextResponse.json(
        { detail: 'You are already a member of a team. Leave it before starting your own.' },
        { status: 409 },
      );
    }
    teamId = existing.id;
  } else {
    const created = await createTeamForOwner({
      ownerId: claims.sub,
      name: 'My team',
      bundleTier: TEAMS_SUBSCRIPTION_TIER,
    });
    teamId = created.id;
  }

  const seats = tier.seatsIncluded;
  const origin = request.nextUrl.origin;
  const success_url =
    typeof body.success_url === 'string' && body.success_url.startsWith('http')
      ? body.success_url
      : `${origin}/dashboard/team?membership=active`;
  const cancel_url =
    typeof body.cancel_url === 'string' && body.cancel_url.startsWith('http')
      ? body.cancel_url
      : `${origin}/pricing?checkout=cancelled`;

  try {
    const session = await getStripeClient().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: seats }],
      customer_email: claims.email,
      success_url,
      cancel_url,
      metadata: {
        carsi_user_id: claims.sub,
        carsi_team_id: teamId,
        plan: tierId,
        seat_count: String(seats),
        source: 'carsi-teams-subscription',
      },
      subscription_data: {
        metadata: {
          carsi_user_id: claims.sub,
          carsi_team_id: teamId,
          plan: tierId,
          seat_count: String(seats),
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
    }
    return NextResponse.json({ url: session.url, checkout_url: session.url, team_id: teamId });
  } catch (error) {
    console.error('[subscription/teams/checkout] Stripe error:', error);
    // If we just created an empty team and checkout failed, it simply has no
    // subscription and no seats — harmless, left for the owner to retry against.
    // Not deleting, to avoid a race with a late webhook.
    return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
  }
}
