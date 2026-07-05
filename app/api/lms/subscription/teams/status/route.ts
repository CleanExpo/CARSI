/**
 * GET /api/lms/subscription/teams/status — the current user's Teams seat
 * subscription status (WS1-E2, GP-442), for the owner dashboard seats/usage view
 * and member "included in your team membership" affordances.
 *
 * When SUBSCRIPTIONS_ENABLED is off, or the user is not signed in, returns the
 * "no team subscription" payload so behaviour is unchanged until enabled. Fails
 * closed on any error.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getTeamEntitlements } from '@/lib/server/entitlements';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const NO_TEAM_SUBSCRIPTION = {
  has_team_subscription: false,
  has_active_seat: false,
  status: null as string | null,
  reason: 'none' as const,
  seat_limit: 0,
  seats_used: 0,
  seats_remaining: 0,
  current_period_end: null as string | null,
  is_owner: false,
  in_grace: false,
};

export async function GET(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json(NO_TEAM_SUBSCRIPTION);
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json(NO_TEAM_SUBSCRIPTION);
  }

  try {
    const ent = await getTeamEntitlements(claims.sub);
    return NextResponse.json({
      has_team_subscription: Boolean(ent.status),
      has_active_seat: ent.hasActiveSeat,
      status: ent.status,
      reason: ent.reason,
      seat_limit: ent.seatLimit,
      seats_used: ent.seatsUsed,
      seats_remaining: Math.max(0, ent.seatLimit - ent.seatsUsed),
      current_period_end: ent.currentPeriodEnd ? ent.currentPeriodEnd.toISOString() : null,
      is_owner: ent.isOwner,
      in_grace: ent.reason === 'grace',
    });
  } catch (error) {
    console.error('[subscription/teams/status] failed (fail-closed):', error);
    return NextResponse.json(NO_TEAM_SUBSCRIPTION);
  }
}
