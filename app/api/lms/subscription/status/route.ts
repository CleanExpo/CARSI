/**
 * GET /api/lms/subscription/status — real individual membership status.
 *
 * Replaces the `has_subscription: false` stub in app/api/lms/[[...path]]/route.ts
 * (this dedicated route shadows the catch-all). Returns the shape the student
 * dashboard already consumes (`SubData`), extended with membership decision
 * fields for honest UI (grace banner / renew CTA).
 *
 * When SUBSCRIPTIONS_ENABLED is off, or the user is not signed in, it returns
 * the same "no subscription" payload the stub returned — so behaviour is
 * unchanged until the feature is switched on. Fails closed on any error.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getEntitlements } from '@/lib/server/entitlements';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const NO_SUBSCRIPTION = {
  has_subscription: false,
  status: null as string | null,
  plan: null as string | null,
  current_period_end: null as string | null,
  trial_end: null as string | null,
  reason: 'none' as const,
  cancel_at_period_end: false,
  in_grace: false,
};

export async function GET(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json(NO_SUBSCRIPTION);
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json(NO_SUBSCRIPTION);
  }

  try {
    const ent = await getEntitlements(claims.sub);
    return NextResponse.json({
      has_subscription: ent.hasActiveMembership,
      status: ent.status,
      plan: ent.status ? 'pro_annual' : null,
      current_period_end: ent.currentPeriodEnd ? ent.currentPeriodEnd.toISOString() : null,
      trial_end: null,
      reason: ent.reason,
      cancel_at_period_end: ent.cancelAtPeriodEnd,
      in_grace: ent.reason === 'grace',
    });
  } catch (error) {
    console.error('[subscription/status] failed (fail-closed):', error);
    return NextResponse.json(NO_SUBSCRIPTION);
  }
}
