import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { decideCoachingPortalEntitlement } from '@/lib/server/carsi-coaching-entitlement';
import { saveCoachingSessionPrep } from '@/lib/server/carsi-coaching-session-prep';
import { getCoachingPortalRowForUser } from '@/lib/server/carsi-coaching-subscription-store';

export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const sub = await getCoachingPortalRowForUser(claims.sub);
  const entitlement = decideCoachingPortalEntitlement(
    sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null
  );
  if (!entitlement.entitled) {
    return NextResponse.json({ detail: 'Active coaching subscription required.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    notes?: string;
    notifyCoach?: boolean;
  } | null;

  const result = await saveCoachingSessionPrep(claims, {
    notes: typeof body?.notes === 'string' ? body.notes : '',
    notifyCoach: body?.notifyCoach !== false,
  });

  if (!result.ok) {
    return NextResponse.json({ detail: result.detail }, { status: 400 });
  }

  return NextResponse.json({ savedAt: result.savedAt });
}
