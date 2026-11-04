import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  getMyAccountability,
  saveMyKpis,
  submitMyCheckIn,
} from '@/lib/server/carsi-coaching-accountability';
import { isCarsiCoachingAccountabilityEnabled } from '@/lib/server/carsi-coaching-accountability-flag';
import { getAccountabilityStore } from '@/lib/server/carsi-coaching-accountability-store';
import { requireCoachingPortalSubscriber } from '@/lib/server/carsi-coaching-portal-gate';

export const dynamic = 'force-dynamic';

/**
 * GP-635 accountability for coaching members.
 * GET  → the caller's own KPIs, check-in state, streak, completion rate and KPI trend
 * POST → { kpis: [{ id?, label }] } sets 3 to 5 KPIs on the plan,
 *        or { checkIn: { values: { [kpiId]: number } } } saves this fortnight's numbers
 * Sign-in is checked first (401), then the feature flag (404), then the subscription (403).
 * The member always comes from the session, never from the request.
 */
async function gate(request: NextRequest) {
  if (!(await getSessionClaimsFromRequest(request))) {
    return { error: NextResponse.json({ detail: 'Sign in required.' }, { status: 401 }) };
  }
  if (!isCarsiCoachingAccountabilityEnabled()) {
    return { error: NextResponse.json({ detail: 'Not found.' }, { status: 404 }) };
  }
  return requireCoachingPortalSubscriber(request);
}

export async function GET(request: NextRequest) {
  const g = await gate(request);
  if ('error' in g) return g.error;
  const accountability = await getMyAccountability(
    getAccountabilityStore(),
    g.claims.sub,
    new Date()
  );
  return NextResponse.json({ accountability });
}

export async function POST(request: NextRequest) {
  const g = await gate(request);
  if ('error' in g) return g.error;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const store = getAccountabilityStore();
  const now = new Date();

  let outcome;
  if (body && 'kpis' in body) {
    outcome = await saveMyKpis(store, g.claims.sub, body.kpis, now);
  } else if (body && body.checkIn && typeof body.checkIn === 'object') {
    outcome = await submitMyCheckIn(
      store,
      g.claims.sub,
      (body.checkIn as Record<string, unknown>).values,
      now
    );
  } else {
    return NextResponse.json({ detail: 'Send kpis or checkIn.' }, { status: 400 });
  }

  if (outcome.status === 'invalid') {
    return NextResponse.json(
      { detail: 'Check the numbers: 3 to 5 named KPIs, and a value of zero or more for each.' },
      { status: 400 }
    );
  }
  if (outcome.status === 'no_kpis') {
    return NextResponse.json({ detail: 'Choose your KPIs first.' }, { status: 400 });
  }
  return NextResponse.json({ accountability: outcome.view });
}
