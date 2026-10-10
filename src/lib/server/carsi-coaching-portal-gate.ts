import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { decideCoachingPortalEntitlement } from '@/lib/server/carsi-coaching-entitlement';
import { coachingPortalCanEdit } from '@/lib/server/carsi-coaching-portal-edit';
import { getCoachingPortalRowForUser } from '@/lib/server/carsi-coaching-subscription-store';

export const COACHING_PORTAL_SUBSCRIPTION_REQUIRED_DETAIL =
  'Active coaching subscription required.';

export type CoachingPortalEditorGate = {
  claims: SessionClaims;
  entitled: boolean;
};

export async function requireCoachingPortalEditor(
  request: NextRequest
): Promise<CoachingPortalEditorGate | { error: NextResponse }> {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return { error: NextResponse.json({ detail: 'Sign in required.' }, { status: 401 }) };
  }

  const sub = await getCoachingPortalRowForUser(claims.sub);
  const entitlement = decideCoachingPortalEntitlement(
    sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null
  );

  if (!coachingPortalCanEdit(claims, entitlement.entitled)) {
    return {
      error: NextResponse.json(
        { detail: COACHING_PORTAL_SUBSCRIPTION_REQUIRED_DETAIL },
        { status: 403 }
      ),
    };
  }

  return { claims, entitled: entitlement.entitled };
}

/** Stripe billing portal and other subscriber-only flows (not staff preview / dev unlock). */
export async function requireCoachingPortalSubscriber(
  request: NextRequest
): Promise<CoachingPortalEditorGate | { error: NextResponse }> {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return { error: NextResponse.json({ detail: 'Sign in required.' }, { status: 401 }) };
  }

  const sub = await getCoachingPortalRowForUser(claims.sub);
  const entitlement = decideCoachingPortalEntitlement(
    sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null
  );

  if (!entitlement.entitled) {
    return {
      error: NextResponse.json(
        { detail: COACHING_PORTAL_SUBSCRIPTION_REQUIRED_DETAIL },
        { status: 403 }
      ),
    };
  }

  return { claims, entitled: true };
}
