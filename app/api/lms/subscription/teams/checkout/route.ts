/**
 * POST /api/lms/subscription/teams/checkout — start a Teams SEAT subscription
 * (WS1-E2, GP-442) Stripe Checkout in `mode: 'subscription'`.
 *
 * Body: { tier?: 'business_owner', extra_seats?: 0..50, success_url?, cancel_url? }
 *
 * Seat billing (GP-773, founder rulings 23/11/2026 "Build seat billing now" and "Your 20/10
 * prices only"): Teams is the business owner plan. The subscription carries the verified
 * A$1,295 yearly owner Price at quantity 1 (it includes the owner's seat), plus a SEPARATE item
 * on the verified A$695 yearly extra-seat Price whose quantity is the extra staff bought, each
 * with their own login. The retired A$299 / A$799 / A$2,499 bundle tiers answer 400. With no extra seats the seat item is left out (Stripe Checkout is never
 * sent a zero quantity); the seat-expansion route adds it later. The line items come from
 * `teamCheckoutLineItems`, the shape the one Teams rule (`classifyTeamSubscription`) accepts; the
 * webhook and seat expansion identify each item by its own Price through that rule. The verified
 * Price ids are also stamped into metadata as an operator record only. Both Prices must resolve and
 * verify, or the checkout answers 503 and opens nothing.
 *
 * Ships DARK behind SUBSCRIPTIONS_ENABLED + TEAMS_SUBSCRIPTIONS_ENABLED and FAILS CLOSED at every uncertain
 * step (flag off / not signed in / Stripe unconfigured / Price unresolvable /
 * already on another team) — exactly the E1 pattern.
 *
 * The team is provisioned up front (owner-only, seat_limit = included seats) so
 * the Stripe subscription can carry `carsi_team_id`, letting the webhook map the
 * subscription back to the team. The seat_limit becomes authoritative once the
 * subscription webhook confirms the paid quantity.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAppOrigin, getCheckoutReturnUrl } from '@/lib/server/app-url';

import { getStripeClient } from '@/lib/api/stripe';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { teamTierById, type TeamBundleTierId } from '@/lib/lms/pricing-tiers';
import {
  resolveTeamOwnerPlanPriceId,
  resolveTeamSeatPriceId,
} from '@/lib/server/team-subscription-price';
import { teamCheckoutLineItems } from '@/lib/server/team-subscription-store-pure';
import { ensureContainerTeamForOwner, getTeamForUser } from '@/lib/server/teams';
import {
  checkoutSessionIdempotencyKey,
  checkoutSessionExpiresAt,
  reserveTeamCheckout,
} from '@/lib/server/membership-checkout-reservation';
import { teamSubscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const UNAVAILABLE = 'Teams membership purchasing is not yet available.';
const TEAMS_PLAN_ID: TeamBundleTierId = 'business_owner';
const TEAMS_SUBSCRIPTION_TIER = 'teams_subscription';
/** Same cap as the seat-expansion route. */
const MAX_EXTRA_SEATS = 50;

export async function POST(request: NextRequest) {
  if (!teamSubscriptionsEnabled()) {
    return NextResponse.json({ detail: UNAVAILABLE }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in to start a Teams membership.' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { detail: 'Payments not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    tier?: string;
    extra_seats?: unknown;
    success_url?: string;
    cancel_url?: string;
  };

  // One Teams plan. An omitted tier means that plan; any other value (including the retired
  // starter / growth / full_library bundles) is refused.
  const tierId = (body.tier ?? TEAMS_PLAN_ID).trim().toLowerCase() as TeamBundleTierId;
  const tier = teamTierById(tierId);
  if (!tier) {
    return NextResponse.json({ detail: 'Unknown Teams plan.' }, { status: 400 });
  }

  const extraSeats = body.extra_seats === undefined ? 0 : body.extra_seats;
  if (
    typeof extraSeats !== 'number' ||
    !Number.isInteger(extraSeats) ||
    extraSeats < 0 ||
    extraSeats > MAX_EXTRA_SEATS
  ) {
    return NextResponse.json(
      { detail: `Choose between 0 and ${MAX_EXTRA_SEATS} extra seats.` },
      { status: 400 }
    );
  }

  // Fail closed: both the owner plan and the seat Price must verify, never a wrong Price. The
  // seat Price is required even with no extra staff, because the plan is sold with A$695 seats.
  const [basePriceId, seatPriceId] = await Promise.all([
    resolveTeamOwnerPlanPriceId(),
    resolveTeamSeatPriceId(),
  ]);
  if (!basePriceId || !seatPriceId) {
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
        { status: 409 }
      );
    }
    teamId = existing.id;
  } else {
    // Atomic find-or-create: `LmsTeam.slug` is unique and derived from the
    // owner, so two concurrent checkouts converge on ONE container instead of
    // creating two teams to bill separately.
    const container = await ensureContainerTeamForOwner({
      ownerId: claims.sub,
      name: 'My team',
      tier: TEAMS_SUBSCRIPTION_TIER,
    });
    teamId = container.id;
  }

  // Then claim the checkout itself, so two requests on the SAME team cannot each
  // open a session. Fails closed: an unverifiable state opens no checkout.
  const reservedAt = new Date();
  const reservation = await reserveTeamCheckout(teamId, reservedAt);
  if (reservation !== 'reserved') {
    return reservation === 'busy'
      ? NextResponse.json(
          {
            detail:
              'A Teams checkout is already open for your team. Finish it, or try again in a few minutes.',
          },
          { status: 409 }
        )
      : NextResponse.json(
          { detail: 'We could not start checkout just now. Please try again shortly.' },
          { status: 503 }
        );
  }

  const seats = tier.seatsIncluded + extraSeats;
  // The shape the one Teams rule (classifyTeamSubscription) accepts: owner plan x1, plus the seat
  // item only when extra seats are bought.
  const lineItems = teamCheckoutLineItems(basePriceId, seatPriceId, extraSeats);
  // Record for operators only: nothing reads these ids to identify items (the rule matches each
  // item by its own Price).
  const seatMetadata = {
    base_price_id: basePriceId,
    seat_price_id: seatPriceId,
    extra_seats: String(extraSeats),
    seat_count: String(seats),
  };
  const origin = getAppOrigin(request);
  const success_url = getCheckoutReturnUrl(
    body.success_url,
    `${origin}/dashboard/team?membership=active`,
  );
  const cancel_url = getCheckoutReturnUrl(body.cancel_url, `${origin}/pricing?checkout=cancelled`);

  try {
    const session = await getStripeClient().checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: lineItems,
        // Paired with the reservation TTL — see membership-checkout-reservation.
        expires_at: checkoutSessionExpiresAt(reservedAt),
        customer_email: claims.email,
        success_url,
        cancel_url,
        metadata: {
          carsi_user_id: claims.sub,
          carsi_team_id: teamId,
          plan: tierId,
          ...seatMetadata,
          source: 'carsi-teams-subscription',
        },
        subscription_data: {
          metadata: {
            carsi_user_id: claims.sub,
            carsi_team_id: teamId,
            plan: tierId,
            ...seatMetadata,
          },
        },
        // GP-773: no promotion codes on a membership (founder ruling: "no further discounts").
      },
      {
        idempotencyKey: checkoutSessionIdempotencyKey('team', teamId, reservedAt),
      }
    );

    if (!session.url) {
      return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
    }
    return NextResponse.json({ url: session.url, checkout_url: session.url, team_id: teamId });
  } catch (error) {
    // Stripe may have accepted the session before a timeout or 5xx. Keep the
    // reservation until the paired TTL expires so a retry cannot double-bill.
    console.error('[subscription/teams/checkout] Stripe error:', error);
    // If we just created an empty team and checkout failed, it simply has no
    // subscription and no seats — harmless, left for the owner to retry against.
    // Not deleting, to avoid a race with a late webhook.
    return NextResponse.json({ detail: 'Failed to start checkout session.' }, { status: 500 });
  }
}
