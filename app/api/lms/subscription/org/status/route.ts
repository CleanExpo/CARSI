/**
 * GET /api/lms/subscription/org/status — the current user's organisation
 * subscription status (WS1-E3, GP-443), for the org dashboard and the honest
 * "included in your organisation subscription" affordance.
 *
 * When SUBSCRIPTIONS_ENABLED is off, or the user is not signed in, returns the
 * "no org subscription" payload so behaviour is unchanged until enabled. Fails
 * closed on any error.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getOrgEntitlements } from '@/lib/server/entitlements';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

const NO_ORG_SUBSCRIPTION = {
  has_org_subscription: false,
  has_active_org: false,
  status: null as string | null,
  reason: 'none' as const,
  entitled_category: null as string | null,
  current_period_end: null as string | null,
  in_grace: false,
};

export async function GET(request: NextRequest) {
  if (!subscriptionsEnabled()) {
    return NextResponse.json(NO_ORG_SUBSCRIPTION);
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json(NO_ORG_SUBSCRIPTION);
  }

  try {
    const ent = await getOrgEntitlements(claims.sub);
    return NextResponse.json({
      has_org_subscription: Boolean(ent.status),
      has_active_org: ent.hasActiveOrg,
      status: ent.status,
      reason: ent.reason,
      entitled_category: ent.entitledCategory,
      current_period_end: ent.currentPeriodEnd ? ent.currentPeriodEnd.toISOString() : null,
      in_grace: ent.reason === 'grace',
    });
  } catch (error) {
    console.error('[subscription/org/status] failed (fail-closed):', error);
    return NextResponse.json(NO_ORG_SUBSCRIPTION);
  }
}
