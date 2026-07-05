/**
 * POST /api/lms/subscription/teams/expand-seats — buy additional seats on an
 * active Teams seat subscription (WS1-E2, GP-442) by increasing the Stripe
 * subscription `quantity` with proration.
 *
 * Body: { additional_seats: number }  (1..50)
 *
 * Seat-billing decision (see the checkout route + PR body): seats are the
 * subscription `quantity`. Expansion updates the single subscription item's
 * quantity and lets Stripe prorate the mid-cycle difference
 * (`proration_behavior: 'create_prorations'`). The webhook
 * (customer.subscription.updated) then refreshes `seatLimit` from the new
 * quantity — so entitlement follows billing, server-side and fail-closed.
 *
 * Owner-only. FAILS CLOSED: flag off / not signed in / not the owner / no active
 * subscription → no expansion, no charge.
 */

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/api/stripe';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { decideTeamSeatSubscription } from '@/lib/server/entitlements';
import { getTeamForUser } from '@/lib/server/teams';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const MAX_ADDITIONAL = 50;

export async function POST(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json({ detail: 'Teams membership is not yet available.' }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json({ detail: 'Payments not configured.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { additional_seats?: number };
  const additional = Number(body.additional_seats);
  if (!Number.isInteger(additional) || additional < 1 || additional > MAX_ADDITIONAL) {
    return NextResponse.json(
      { detail: `Choose between 1 and ${MAX_ADDITIONAL} additional seats.` },
      { status: 400 },
    );
  }

  const team = await getTeamForUser(claims.sub);
  if (!team || team.ownerId !== claims.sub) {
    return NextResponse.json(
      { detail: 'Only the team owner can add seats.' },
      { status: 403 },
    );
  }

  const sub = await prisma.lmsTeamSubscription.findUnique({ where: { teamId: team.id } });
  if (!sub || !sub.stripeSubscriptionId) {
    return NextResponse.json(
      { detail: 'No active Teams subscription to expand.' },
      { status: 409 },
    );
  }

  // Only expand a live subscription (active/grace) — never resurrect a lapsed one
  // by adding seats. Fail closed on any non-live state.
  const decision = decideTeamSeatSubscription({
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    seatLimit: sub.seatLimit,
  });
  if (!decision.subscriptionEntitled) {
    return NextResponse.json(
      { detail: 'Your Teams subscription is not active. Renew before adding seats.', reason: decision.reason },
      { status: 409 },
    );
  }

  const newQuantity = sub.seatLimit + additional;

  try {
    const stripe = getStripeClient();
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const item = stripeSub.items?.data?.[0];
    if (!item) {
      return NextResponse.json({ detail: 'Subscription item not found.' }, { status: 500 });
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items: [{ id: item.id, quantity: newQuantity }],
      proration_behavior: 'create_prorations',
    });

    // Optimistically reflect the new seat limit; the customer.subscription.updated
    // webhook re-confirms it authoritatively from the paid quantity.
    await prisma.lmsTeamSubscription.update({
      where: { teamId: team.id },
      data: { seatLimit: newQuantity },
    });

    return NextResponse.json({ ok: true, seat_limit: newQuantity, added: additional });
  } catch (error) {
    console.error('[subscription/teams/expand-seats] Stripe error:', error);
    return NextResponse.json({ detail: 'Failed to add seats.' }, { status: 500 });
  }
}
